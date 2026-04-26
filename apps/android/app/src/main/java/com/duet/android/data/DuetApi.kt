package com.duet.android.data

import okhttp3.ResponseBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Param
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
    suspend fun updateThemePreference(@Body body: ThemePreferenceRequest): AuthMeResponse

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

    @POST("profile/me/bind")
    suspend fun bindCouple(@Body body: BindCoupleRequest): ResponseBody

    @DELETE("profile/me/bind")
    suspend fun unbindCouple(): ResponseBody

    @POST("profile/me/transactions")
    suspend fun createTransaction(@Body body: CreateTransactionRequest): ResponseBody

    @PATCH("profile/me/transactions/{id}")
    suspend fun updateTransaction(@Param("id") id: String, @Body body: UpdateTransactionRequest): ResponseBody

    @DELETE("profile/me/transactions/{id}")
    suspend fun deleteTransaction(@Param("id") id: String): ResponseBody

    @GET("profile/me/categories")
    suspend fun categories(): CategoryCatalogResponse

    @POST("profile/me/categories")
    suspend fun createCategory(@Body body: CreateCategoryRequest): ResponseBody

    @PATCH("profile/me/categories/{id}/visibility")
    suspend fun updateCategoryVisibility(@Param("id") id: String, @Body body: UpdateCategoryVisibilityRequest): ResponseBody

    @DELETE("profile/me/categories/{id}")
    suspend fun deleteCategory(@Param("id") id: String): ResponseBody
}
