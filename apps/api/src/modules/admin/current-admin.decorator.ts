import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.admin as { email: string };
});
