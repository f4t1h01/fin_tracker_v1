package com.duet.android.data.local

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

const val OUTBOX_STATUS_PENDING = "PENDING"
const val OUTBOX_STATUS_SYNCING = "SYNCING"
const val OUTBOX_STATUS_SYNCED = "SYNCED"
const val OUTBOX_STATUS_FAILED = "FAILED"

const val OUTBOX_TYPE_TRANSACTION_CREATE = "TRANSACTION_CREATE"
const val OUTBOX_TYPE_GOODS_ITEM_CREATE = "GOODS_ITEM_CREATE"

@Entity(tableName = "outbox_mutation")
data class OutboxMutationEntity(
    @PrimaryKey val clientMutationId: String,
    val type: String,
    val payloadJson: String,
    val title: String,
    val subtitle: String,
    val status: String = OUTBOX_STATUS_PENDING,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val serverId: String? = null,
    val lastError: String? = null,
    val attemptCount: Int = 0
)

@Entity(tableName = "cached_json")
data class CachedJsonEntity(
    @PrimaryKey val key: String,
    val json: String,
    val updatedAt: Long = System.currentTimeMillis()
)

@Dao
interface OutboxDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: OutboxMutationEntity)

    @Query("SELECT * FROM outbox_mutation WHERE status IN (:statuses) ORDER BY createdAt ASC")
    suspend fun listByStatuses(statuses: List<String>): List<OutboxMutationEntity>

    @Query("SELECT * FROM outbox_mutation WHERE status IN (:statuses) ORDER BY createdAt ASC")
    fun observeByStatuses(statuses: List<String>): Flow<List<OutboxMutationEntity>>

    @Query("UPDATE outbox_mutation SET status = :status, updatedAt = :updatedAt, lastError = :lastError, attemptCount = attemptCount + :attemptDelta WHERE clientMutationId = :clientMutationId")
    suspend fun updateStatus(clientMutationId: String, status: String, updatedAt: Long = System.currentTimeMillis(), lastError: String? = null, attemptDelta: Int = 0)

    @Query("UPDATE outbox_mutation SET status = :status, serverId = :serverId, updatedAt = :updatedAt, lastError = NULL WHERE clientMutationId = :clientMutationId")
    suspend fun markSynced(clientMutationId: String, serverId: String?, status: String = OUTBOX_STATUS_SYNCED, updatedAt: Long = System.currentTimeMillis())
}

@Dao
interface CachedJsonDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: CachedJsonEntity)

    @Query("SELECT * FROM cached_json WHERE `key` = :key")
    suspend fun get(key: String): CachedJsonEntity?

    @Query("DELETE FROM cached_json")
    suspend fun clear()
}

@Database(
    entities = [OutboxMutationEntity::class, CachedJsonEntity::class],
    version = 1,
    exportSchema = false
)
abstract class DuetLocalDatabase : RoomDatabase() {
    abstract fun outboxDao(): OutboxDao
    abstract fun cachedJsonDao(): CachedJsonDao

    companion object {
        @Volatile private var instance: DuetLocalDatabase? = null

        fun get(context: Context): DuetLocalDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    DuetLocalDatabase::class.java,
                    "duet_local.db"
                ).build().also { instance = it }
            }
        }
    }
}
