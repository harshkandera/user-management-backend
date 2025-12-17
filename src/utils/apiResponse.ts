import { Response } from 'express';

interface ApiResponseData {
  success: boolean;
  message?: string;
  data?: any;
  meta?: any;
}

export class ApiResponse {
  static success(res: Response, data: any, message?: string, statusCode: number = 200) {
    const response: ApiResponseData = {
      success: true,
      ...(message && { message }),
      data,
    };
    return res.status(statusCode).json(response);
  }

  static successWithMeta(
    res: Response,
    data: any,
    meta: any,
    message?: string,
    statusCode: number = 200,
  ) {
    const response: ApiResponseData = {
      success: true,
      ...(message && { message }),
      data,
      meta,
    };
    return res.status(statusCode).json(response);
  }

  static created(res: Response, data: any, message: string = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static error(res: Response, message: string, statusCode: number = 500) {
    const response: ApiResponseData = {
      success: false,
      message,
    };
    return res.status(statusCode).json(response);
  }
}

export default ApiResponse;
