import { Request, Response } from "express";

import { LoginUser, registerService } from "../../services/auth/auth.services";
import { errorResponse, successResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";

export const register = async (req: Request, res: Response) => {
  try {
    const { businessName, email, password, address } = req.body;

    if (!businessName || !email || !password) {
      return errorResponse(
        res,
        "Missing required fields",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const result = await registerService({
      businessName,
      email,
      password,
      address,
    });

    return successResponse(
      res,
      result,
      "Business registered successfully",
      HTTP_STATUS.CREATED
    );
  } catch (err: any) {
    if (err.message === "EMAIL_ALREADY_EXISTS") {
      return errorResponse(
        res,
        "Email already exists",
        HTTP_STATUS.CONFLICT
      );
    }

    return errorResponse(
      res,
      `Registration failed: ${err.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const login = async(req: Request, res: Response)=>{
    const{email,password} = req.body;

    try{
      console.log("Login attempt for email:", email, password);
        const result = await LoginUser(email,password);

        return successResponse(
            res,
            result,
            "Login Successful",
            HTTP_STATUS.OK
        );
    }catch(err: any){
        return errorResponse(
            res,
            err.message,
            HTTP_STATUS.UNAUTHORIZED
        );
    }
};
