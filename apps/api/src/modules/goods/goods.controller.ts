import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CreateGoodsAdvisorMessageDto,
  CreateGoodsAdvisorThreadDto,
  CreateGoodsCategoryDto,
  GoodsDinnerAdvisorDto,
  CreateGoodsItemDto,
  CreateGoodsPlaceDto,
  GoodsArchiveDto,
  GoodsListQueryDto,
  GoodsMoveDto,
  GoodsQuantityMutationDto,
  GoodsReconcileDto,
  UpdateGoodsAdvisorThreadDto,
  UpdateGoodsCategoryDto,
  UpdateGoodsItemDto,
  UpdateGoodsVisibilityDto,
  UpdateGoodsPlaceDto
} from "./dto/goods.dto";
import { GoodsService } from "./goods.service";

@UseGuards(JwtAuthGuard)
@Controller("profile/me/goods")
export class GoodsController {
  constructor(private readonly goodsService: GoodsService) {}

  @Get("advisor/threads")
  listAdvisorThreads(@CurrentUser() user: { id: string }) {
    return this.goodsService.listAdvisorThreads(user.id);
  }

  @Post("advisor/threads")
  createAdvisorThread(@CurrentUser() user: { id: string }, @Body() dto: CreateGoodsAdvisorThreadDto) {
    return this.goodsService.createAdvisorThread(user.id, dto);
  }

  @Get("advisor/threads/:id")
  getAdvisorThread(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.goodsService.getAdvisorThread(user.id, id);
  }

  @Post("advisor/threads/:id/messages")
  sendAdvisorThreadMessage(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: CreateGoodsAdvisorMessageDto) {
    return this.goodsService.sendAdvisorThreadMessage(user.id, id, dto);
  }

  @Patch("advisor/threads/:id")
  updateAdvisorThread(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: UpdateGoodsAdvisorThreadDto) {
    return this.goodsService.updateAdvisorThread(user.id, id, dto);
  }

  @Delete("advisor/threads/:id")
  deleteAdvisorThread(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.goodsService.deleteAdvisorThread(user.id, id);
  }

  @Post("advisor/dinner")
  dinnerAdvisor(@CurrentUser() user: { id: string }, @Body() dto: GoodsDinnerAdvisorDto) {
    return this.goodsService.requestDinnerAdvice(user.id, dto);
  }

  @Get("snapshot")
  snapshot(@CurrentUser() user: { id: string }) {
    return this.goodsService.snapshot(user.id);
  }

  @Get("items")
  listItems(@CurrentUser() user: { id: string }, @Query() query: GoodsListQueryDto) {
    return this.goodsService.listItems(user.id, query);
  }

  @Get("items/:id")
  itemDetail(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.goodsService.itemDetail(user.id, id);
  }

  @Get("items/:id/events")
  itemEvents(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.goodsService.itemEvents(user.id, id);
  }

  @Post("items")
  createItem(@CurrentUser() user: { id: string }, @Body() dto: CreateGoodsItemDto) {
    return this.goodsService.createItem(user.id, dto);
  }

  @Patch("items/:id")
  updateItem(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: UpdateGoodsItemDto) {
    return this.goodsService.updateItem(user.id, id, dto);
  }

  @Post("items/:id/restock")
  restockItem(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: GoodsQuantityMutationDto) {
    return this.goodsService.restockItem(user.id, id, dto);
  }

  @Post("items/:id/consume")
  consumeItem(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: GoodsQuantityMutationDto) {
    return this.goodsService.consumeItem(user.id, id, dto);
  }

  @Post("items/:id/reconcile")
  reconcileItem(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: GoodsReconcileDto) {
    return this.goodsService.reconcileItem(user.id, id, dto);
  }

  @Post("items/:id/move")
  moveItem(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: GoodsMoveDto) {
    return this.goodsService.moveItem(user.id, id, dto);
  }

  @Post("items/:id/archive")
  archiveItem(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: GoodsArchiveDto) {
    return this.goodsService.archiveItem(user.id, id, dto);
  }

  @Get("places")
  listPlaces(@CurrentUser() user: { id: string }) {
    return this.goodsService.listPlaces(user.id);
  }

  @Post("places")
  createPlace(@CurrentUser() user: { id: string }, @Body() dto: CreateGoodsPlaceDto) {
    return this.goodsService.createPlace(user.id, dto);
  }

  @Patch("places/:id")
  updatePlace(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: UpdateGoodsPlaceDto) {
    return this.goodsService.updatePlace(user.id, id, dto);
  }

  @Patch("places/:id/visibility")
  updatePlaceVisibility(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: UpdateGoodsVisibilityDto) {
    return this.goodsService.updatePlaceVisibility(user.id, id, dto);
  }

  @Delete("places/:id")
  deletePlace(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.goodsService.deletePlace(user.id, id);
  }

  @Post("places/:id/archive")
  archivePlace(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.goodsService.archivePlace(user.id, id);
  }

  @Get("categories")
  listCategories(@CurrentUser() user: { id: string }) {
    return this.goodsService.listCategories(user.id);
  }

  @Post("categories")
  createCategory(@CurrentUser() user: { id: string }, @Body() dto: CreateGoodsCategoryDto) {
    return this.goodsService.createCategory(user.id, dto);
  }

  @Patch("categories/:id")
  updateCategory(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: UpdateGoodsCategoryDto) {
    return this.goodsService.updateCategory(user.id, id, dto);
  }

  @Patch("categories/:id/visibility")
  updateCategoryVisibility(@CurrentUser() user: { id: string }, @Param("id") id: string, @Body() dto: UpdateGoodsVisibilityDto) {
    return this.goodsService.updateCategoryVisibility(user.id, id, dto);
  }

  @Delete("categories/:id")
  deleteCategory(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.goodsService.deleteCategory(user.id, id);
  }

  @Post("categories/:id/archive")
  archiveCategory(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.goodsService.archiveCategory(user.id, id);
  }

  @Get("uoms")
  listUoms(@CurrentUser() user: { id: string }) {
    return this.goodsService.listUoms(user.id);
  }
}
