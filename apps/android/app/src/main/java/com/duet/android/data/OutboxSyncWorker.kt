package com.duet.android.data

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.duet.android.data.local.DuetLocalDatabase
import com.duet.android.data.local.OUTBOX_STATUS_FAILED
import com.duet.android.data.local.OUTBOX_STATUS_PENDING
import com.duet.android.data.local.OUTBOX_STATUS_SYNCING
import com.duet.android.data.local.OUTBOX_TYPE_GOODS_ITEM_CREATE
import com.duet.android.data.local.OUTBOX_TYPE_TRANSACTION_CREATE
import java.util.concurrent.TimeUnit

class OutboxSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val database = DuetLocalDatabase.get(applicationContext)
        val outbox = database.outboxDao()
        val tokenStore = SecureTokenStore(applicationContext)
        if (tokenStore.readToken().isNullOrBlank()) {
            return Result.failure()
        }

        val moshi = NetworkModule.createMoshi()
        val api = NetworkModule.createApi { tokenStore.readToken() }
        val pending = outbox.listByStatuses(listOf(OUTBOX_STATUS_PENDING, OUTBOX_STATUS_FAILED))
        var hadRetryableFailure = false

        for (mutation in pending) {
            outbox.updateStatus(mutation.clientMutationId, OUTBOX_STATUS_SYNCING)
            try {
                when (mutation.type) {
                    OUTBOX_TYPE_TRANSACTION_CREATE -> {
                        val request = requireNotNull(moshi.adapter(CreateTransactionRequest::class.java).fromJson(mutation.payloadJson))
                        api.createTransaction(request).close()
                    }
                    OUTBOX_TYPE_GOODS_ITEM_CREATE -> {
                        val request = requireNotNull(moshi.adapter(CreateGoodsItemRequest::class.java).fromJson(mutation.payloadJson))
                        api.createGoodsItem(request).close()
                    }
                    else -> throw IllegalArgumentException("Unknown outbox mutation type: ${mutation.type}")
                }
                outbox.markSynced(mutation.clientMutationId, null)
            } catch (error: Throwable) {
                val message = error.toUserMessage(moshi)
                outbox.updateStatus(
                    clientMutationId = mutation.clientMutationId,
                    status = OUTBOX_STATUS_FAILED,
                    lastError = message,
                    attemptDelta = 1
                )
                hadRetryableFailure = true
            }
        }

        return if (hadRetryableFailure) Result.retry() else Result.success()
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "duet_outbox_sync"

        fun enqueue(context: Context) {
            val request = OneTimeWorkRequestBuilder<OutboxSyncWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context.applicationContext)
                .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.KEEP, request)
        }
    }
}
