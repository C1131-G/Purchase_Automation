export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details: unknown;
  public status: "fail" | "error";
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = "INTERNAL_ERROR",
    details: unknown = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
