import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  errorCode: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const errorResponse = this.buildResponse(exception, request.url);
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildResponse(
    exception: unknown,
    path: string,
  ): ErrorResponseBody {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const rawResponse = exception.getResponse();
      const message =
        typeof rawResponse === 'object' && rawResponse !== null
          ? (rawResponse as { message?: string | string[] }).message ??
            exception.message
          : exception.message;

      return {
        statusCode,
        timestamp: new Date().toISOString(),
        path,
        message,
        errorCode: exception.name,
        details:
          typeof rawResponse === 'object' && rawResponse !== null
            ? rawResponse
            : undefined,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const statusCode =
        exception.code === 'P2002'
          ? HttpStatus.CONFLICT
          : exception.code === 'P2025'
            ? HttpStatus.NOT_FOUND
            : HttpStatus.BAD_REQUEST;

      return {
        statusCode,
        timestamp: new Date().toISOString(),
        path,
        message: exception.message,
        errorCode: exception.code,
        details: exception.meta,
      };
    }

    const fallbackMessage =
      exception instanceof Error ? exception.message : 'Internal server error';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path,
      message: fallbackMessage,
      errorCode: 'INTERNAL_SERVER_ERROR',
    };
  }
}
