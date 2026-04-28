package com.duet.android.data

import okhttp3.ResponseBody
import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.Part
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.QueryMap

interface DuetApi {
    @POST("auth/password/login")
    suspend fun login(@Body body: PasswordLoginRequest): AuthResponse

    @POST("auth/password/register")
    suspend fun register(@Body body: PasswordRegisterRequest): AuthResponse

    @GET("auth/me")
    suspend fun me(): AuthMeResponse

    @PATCH("auth/preferences/theme")
    suspend fun updateThemePreference(@Body body: ThemePreferenceRequest): ThemePreferenceResponse

    @GET("profile/me/snapshot")
    suspend fun snapshot(@Query("month") month: Int, @Query("year") year: Int): ProfileSnapshotResponse

    @GET("profile/me/dashboard")
    suspend fun dashboard(@QueryMap query: Map<String, String>): DashboardResponse

    @GET("profile/me/dashboard/rates")
    suspend fun dashboardRates(): DashboardRatesResponse

    @PATCH("profile/me/dashboard/rates")
    suspend fun updateDashboardRates(@Body body: DashboardRatesUpdateRequest): DashboardRatesResponse

    @PATCH("profile/me/details")
    suspend fun updateDetails(@Body body: UpdateProfileDetailsRequest): AuthMeResponse

    @PATCH("profile/me/preferences")
    suspend fun updateProfilePreferences(@Body body: UpdateProfilePreferencesRequest): AuthMeResponse

    @POST("auth/password/setup")
    suspend fun setupPassword(@Body body: PasswordSetupRequest): AuthMeResponse

    @PATCH("profile/me/category-preferences")
    suspend fun updateCategoryPreferences(@Body body: CategoryPreferencesRequest): CategoryCatalogResponse

    @POST("profile/me/bind")
    suspend fun bindCouple(@Body body: BindCoupleRequest): ResponseBody

    @DELETE("profile/me/bind")
    suspend fun unbindCouple(): ResponseBody

    @POST("profile/me/transactions")
    suspend fun createTransaction(@Body body: CreateTransactionRequest): ResponseBody

    @Multipart
    @POST("profile/me/voice/draft")
    suspend fun createVoiceDraft(@Part audio: MultipartBody.Part): AiTransactionDraftResponse

    @Multipart
    @POST("profile/me/image/draft")
    suspend fun createImageDraft(@Part image: MultipartBody.Part): AiTransactionDraftResponse

    @PATCH("profile/me/transactions/{id}")
    suspend fun updateTransaction(@Path("id") id: String, @Body body: UpdateTransactionRequest): ResponseBody

    @DELETE("profile/me/transactions/{id}")
    suspend fun deleteTransaction(@Path("id") id: String): ResponseBody

    @GET("profile/me/categories")
    suspend fun categories(): CategoryCatalogResponse

    @POST("profile/me/categories")
    suspend fun createCategory(@Body body: CreateCategoryRequest): ResponseBody

    @PATCH("profile/me/categories/{id}/visibility")
    suspend fun updateCategoryVisibility(@Path("id") id: String, @Body body: UpdateCategoryVisibilityRequest): ResponseBody

    @DELETE("profile/me/categories/{id}")
    suspend fun deleteCategory(@Path("id") id: String): ResponseBody

    @GET("profile/me/goods/snapshot")
    suspend fun goodsSnapshot(): GoodsSnapshotResponse

    @GET("profile/me/goods/items")
    suspend fun goodsItems(@QueryMap query: Map<String, String>): GoodsListResponse

    @POST("profile/me/goods/items")
    suspend fun createGoodsItem(@Body body: CreateGoodsItemRequest): ResponseBody

    @GET("profile/me/goods/places")
    suspend fun goodsPlaces(): GoodsManagePlacesResponse

    @POST("profile/me/goods/places")
    suspend fun createGoodsPlace(@Body body: GoodsCreateNameRequest): ResponseBody

    @PATCH("profile/me/goods/places/{id}/visibility")
    suspend fun updateGoodsPlaceVisibility(@Path("id") id: String, @Body body: UpdateVisibilityRequest): ResponseBody

    @DELETE("profile/me/goods/places/{id}")
    suspend fun deleteGoodsPlace(@Path("id") id: String): ResponseBody

    @GET("profile/me/goods/categories")
    suspend fun goodsCategories(): GoodsManageCategoriesResponse

    @POST("profile/me/goods/categories")
    suspend fun createGoodsCategory(@Body body: GoodsCreateNameRequest): ResponseBody

    @PATCH("profile/me/goods/categories/{id}/visibility")
    suspend fun updateGoodsCategoryVisibility(@Path("id") id: String, @Body body: UpdateVisibilityRequest): ResponseBody

    @DELETE("profile/me/goods/categories/{id}")
    suspend fun deleteGoodsCategory(@Path("id") id: String): ResponseBody

    @GET("profile/me/goods/items/{id}/events")
    suspend fun goodsItemEvents(@Path("id") id: String): GoodsHistoryResponse

    @POST("profile/me/goods/items/{id}/restock")
    suspend fun restockGoodsItem(@Path("id") id: String, @Body body: GoodsQuantityMutationRequest): ResponseBody

    @POST("profile/me/goods/items/{id}/consume")
    suspend fun consumeGoodsItem(@Path("id") id: String, @Body body: GoodsQuantityMutationRequest): ResponseBody

    @POST("profile/me/goods/items/{id}/reconcile")
    suspend fun reconcileGoodsItem(@Path("id") id: String, @Body body: GoodsQuantityMutationRequest): ResponseBody

    @POST("profile/me/goods/items/{id}/move")
    suspend fun moveGoodsItem(@Path("id") id: String, @Body body: GoodsMoveItemRequest): ResponseBody

    @PATCH("profile/me/goods/items/{id}")
    suspend fun updateGoodsItem(@Path("id") id: String, @Body body: GoodsUpdateItemRequest): ResponseBody

    @POST("profile/me/goods/items/{id}/archive")
    suspend fun archiveGoodsItem(@Path("id") id: String, @Body body: Map<String, String> = emptyMap()): ResponseBody

    @GET("profile/me/goods/advisor/threads")
    suspend fun advisorThreads(): GoodsAdvisorThreadsResponse

    @POST("profile/me/goods/advisor/threads")
    suspend fun createAdvisorThread(@Body body: GoodsAdvisorCreateThreadRequest): GoodsAdvisorThreadSummary

    @GET("profile/me/goods/advisor/threads/{id}")
    suspend fun advisorThread(@Path("id") id: String): GoodsAdvisorThreadDetailResponse

    @PATCH("profile/me/goods/advisor/threads/{id}")
    suspend fun updateAdvisorThread(@Path("id") id: String, @Body body: GoodsAdvisorUpdateThreadRequest): GoodsAdvisorThreadSummary

    @DELETE("profile/me/goods/advisor/threads/{id}")
    suspend fun deleteAdvisorThread(@Path("id") id: String): ResponseBody

    @POST("profile/me/goods/advisor/threads/{id}/messages")
    suspend fun sendAdvisorMessage(@Path("id") id: String, @Body body: GoodsAdvisorSendMessageRequest): GoodsAdvisorSendMessageResponse
}
