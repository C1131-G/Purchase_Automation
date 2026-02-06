// AppError: A specialized Error class used throughout the backend to throw predictable, structured errors that include HTTP status codes and API-specific error identifiers.

class AppError extends Error {
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

    // Distinguishes between 4xx client errors ('fail') and 5xx server errors ('error').
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    // Marks the error as 'operational', meaning it's a known, handled error case rather than a programming bug or crash.
    this.isOperational = true;

    // Maintains a clean stack trace by excluding the constructor call from the trace itself.
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
