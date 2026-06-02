import type { ErrorRequestHandler } from "express";
import { HttpError } from "../utils/httpError.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;

  res.status(statusCode).json({
    message: error instanceof Error ? error.message : "Unexpected server error"
  });
};

