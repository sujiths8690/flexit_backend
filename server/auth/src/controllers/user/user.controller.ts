import { Request, Response } from "express";
import { changePasswordService, createUserService, disableUserService, enableUserService, getUserService, requestPasswordResetService, updateUserService } from "../../services/user/user.service";
import { Role } from "@prisma/client";
import {errorResponse, successResponse} from "../../utils/response.helper"
import { HTTP_STATUS } from "../../utils/httpStatus";


export const createUser= async(req:Request, res:Response)=> {
    try{
        const{
            email,
            password,
            role
        }= req.body;

        if(!email || !password || !role){
            return errorResponse(
                res,
                "Missing required fields",
                HTTP_STATUS.BAD_REQUEST
            )
        }

        if(role== Role.ADMIN){
            return errorResponse(
                res,
                "Cannot create Admin user!",
                HTTP_STATUS.FORBIDDEN
            );
        }

        if (!req.user || !req.user.businessId) {
        return errorResponse(
            res,
            "Business not linked",
            HTTP_STATUS.FORBIDDEN
        );
        }

        const businessId = req.user.businessId;

        const user= await createUserService({
            email,
            password,
            role,
            businessId
        });

        return successResponse(
            res,
            user,
            'User created successfully!',
            HTTP_STATUS.CREATED
        )
    }catch(err:any){

        if(err.message === "USER_ALREADY_EXISTS"){
            return errorResponse(
                res,
                "User already exists!",
                HTTP_STATUS.CONFLICT
            );
        }

        return errorResponse(
            res,
            "Failed to create User",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

export const getUser= async(
    req:Request, res:Response
)=> {

    try{
        const id = Number(req.params.id);
        const businessId = req.user!.businessId;

        if(!id || !businessId){
            return errorResponse(
                res,
                "Missing requires fields",
                HTTP_STATUS.BAD_REQUEST
            )
        }

        const user =await getUserService(
            Number(id),
            Number(businessId)
        );

        return successResponse(
            res,
            user,
            "User fetched Succesfully!",
            HTTP_STATUS.OK
        )
    }catch(err:any){
        return errorResponse(
            res,
            "Failed to fetch user!",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
    }
};

export const updateUser= async(
    req: Request, res: Response 
)=>{
    try{
        const id = Number(req.params.id);

        const { email, role }= req.body;

        if (!req.user || !req.user.businessId) {
        return errorResponse(
            res,
            "Business not linked",
            HTTP_STATUS.FORBIDDEN
        );
        }

        const businessId = req.user.businessId;

        const user= await updateUserService({
            id,
            email,
            role,
            businessId
        });

        return successResponse(
            res,
            user,
            "User updated successfully",
            HTTP_STATUS.OK
        );

    }catch(err:any){
        if(err.message === "USER_NOT_FOUND"){
            return errorResponse(
                res,
                "User not found",
                HTTP_STATUS.NOT_FOUND
            );
        }

        if(err.message === "CANNOT_DOWNGRADE_ADMIN"){
            return errorResponse(
                res,
                "Cannot downgrade admin!",
                HTTP_STATUS.FORBIDDEN
            );
        }

        return errorResponse(
            res,
            "Update Failed",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

export const disableUser= async(
    req: Request, res: Response
)=>{

    try{
        const id= Number(req.params.id);

        if (!req.user || !req.user.businessId) {
        return errorResponse(
            res,
            "Business not linked",
            HTTP_STATUS.FORBIDDEN
        );
        }

        const businessId = req.user.businessId;

        await disableUserService(id, businessId);

        return successResponse(
            res,
            null,
            'User disabled successfully!',
            HTTP_STATUS.OK
        );

    }catch(err:any){
        if(err.message === "USER_NOT_FOUND"){
            return errorResponse(
                res,
                "User not found",
                HTTP_STATUS.NOT_FOUND
            );
        }

        if(err.message === "CANNOT_DISABLE_ADMIN"){
            return errorResponse(
                res,
                "Cannot disable admin!",
                HTTP_STATUS.FORBIDDEN
            );
        }

        return errorResponse(
            res,
            "Disable failed!!",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

export const enableUser= async(
    req: Request, res: Response
)=>{

    try{
        const id = Number(req.params.id);

        if (!req.user || !req.user.businessId) {
            return errorResponse(
                res,
                "Business not linked",
                HTTP_STATUS.FORBIDDEN
            );
        }

        const businessId = req.user.businessId;

        await enableUserService(id, businessId);

        return successResponse(
            res,
            null,
            "User enabled successfully!",
            HTTP_STATUS.OK
        );
    }catch(err:any){
        if(err.message === "USER_NOT_FOUND"){
            return errorResponse(
                res,
                "User not found!",
                HTTP_STATUS.NOT_FOUND
            );
        }

        return errorResponse(
            res,
            "User enabled failed!",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

export const changePassword= async(
    req:Request, res: Response
)=>{
    try{
        const{currentPassword, newPassword} = req.body;

        if(!currentPassword || !newPassword){
            return errorResponse(
                res,
                "Missing Fields",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (!req.user || !req.user.businessId) {
        return errorResponse(
            res,
            "Business not linked",
            HTTP_STATUS.FORBIDDEN
        );
        }

        const businessId = req.user.businessId;

        await changePasswordService({
            userId: req.user!.userId,
            businessId,
            currentPassword,
            newPassword
        });

        return successResponse(
            res,
            null,
            "Password Changed successfully!",
            HTTP_STATUS.OK
        );

    }catch(err:any){
        if(err.message === "USER_NOT_FOUND"){
            return errorResponse(
                res,
                "User not found",
                HTTP_STATUS.NOT_FOUND
            );
        }

        if(err.message === "INVALID_CURRENT_PASSWORD"){
            return errorResponse(
                res,
                "Invalid current password!",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        return errorResponse(
            res,
            "Password changed failed!",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

export const passwordReset= async(
    req: Request, res: Response
)=>{
    try{
        const {email} = req.body;

        if(!email){
            return errorResponse(
                res,
                "Email not provided!",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        await requestPasswordResetService(email);

        return successResponse(
            res,
            null,
            "If this email exists, a reset link has been sent",
            HTTP_STATUS.OK
        );
    }catch(err:any){
        return errorResponse(
            res,
            "Something went wrong",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};