import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

const cuidPattern = /^c[a-z0-9]{8,}$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPrismaEntityId(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();
  return cuidPattern.test(normalized) || uuidPattern.test(normalized);
}

export function IsPrismaEntityId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isPrismaEntityId",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return isPrismaEntityId(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid Prisma id`;
        }
      }
    });
  };
}
