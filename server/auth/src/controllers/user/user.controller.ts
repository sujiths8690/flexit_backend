import { Request, Response } from "express";
import { changePasswordService, createUserService, disableUserService, enableUserService, getAdminUserSummaryService, getOwnProfileService, getUserService, listAdminUsersService, requestPasswordResetService, resetPasswordWithTokenService, updateOwnProfileService, updateUserService, verifyCurrentPasswordService, verifyPasswordResetOtpService } from "../../services/user/user.service";
import { Role } from "@prisma/client";
import {errorResponse, successResponse} from "../../utils/response.helper"
import { HTTP_STATUS } from "../../utils/httpStatus";

export const getAdminUserSummary = async (_req: Request, res: Response) => {
    try {
        const summary = await getAdminUserSummaryService();

        return successResponse(
            res,
            summary,
            "User summary fetched successfully",
            HTTP_STATUS.OK
        );
    } catch {
        return errorResponse(
            res,
            "Failed to fetch user summary",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

export const listAdminUsers = async (req: Request, res: Response) => {
    try {
        const users = await listAdminUsersService({
            search: req.query.search?.toString(),
            status: req.query.status?.toString(),
        });

        return successResponse(
            res,
            { users },
            "Users fetched successfully",
            HTTP_STATUS.OK
        );
    } catch {
        return errorResponse(
            res,
            "Failed to fetch users",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};


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

export const getOwnProfile = async(req: Request, res: Response)=> {
    try{
        const user = await getOwnProfileService(req.user!.userId);

        return successResponse(
            res,
            user,
            "Profile fetched successfully",
            HTTP_STATUS.OK
        );
    }catch(err:any){
        return errorResponse(
            res,
            "Failed to fetch profile",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

export const updateOwnProfile = async(req: Request, res: Response)=> {
    try{
        const {
            email,
            username,
            firstName,
            lastName,
            phone,
            profileImageUrl,
        } = req.body;

        const user = await updateOwnProfileService({
            userId: req.user!.userId,
            email,
            username,
            firstName,
            lastName,
            phone,
            profileImageUrl,
        });

        return successResponse(
            res,
            user,
            "Profile updated successfully",
            HTTP_STATUS.OK
        );
    }catch(err:any){
        if(err.message === "EMAIL_ALREADY_EXISTS" || err.message === "USERNAME_ALREADY_EXISTS"){
            return errorResponse(
                res,
                err.message,
                HTTP_STATUS.CONFLICT
            );
        }

        return errorResponse(
            res,
            "Profile update failed",
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

export const verifyCurrentPassword= async(
    req:Request, res: Response
)=>{
    try{
        const{currentPassword} = req.body;

        if(!currentPassword){
            return errorResponse(
                res,
                "Current password is required",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        await verifyCurrentPasswordService(
            req.user!.userId,
            currentPassword
        );

        return successResponse(
            res,
            null,
            "Password verified",
            HTTP_STATUS.OK
        );

    }catch(err:any){
        if(err.message === "INVALID_CURRENT_PASSWORD"){
            return errorResponse(
                res,
                "Invalid current password!",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        return errorResponse(
            res,
            "Password verification failed",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

export const passwordReset= async(
    req: Request, res: Response
)=>{
    try{
        const email = typeof req.body?.email === "string"
            ? req.body.email.trim()
            : "";

        if(!email || !/^\S+@\S+\.\S+$/.test(email)){
            return errorResponse(
                res,
                "Enter a valid email address",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        await requestPasswordResetService(email);

        return successResponse(
            res,
            null,
            "If this email exists, a reset code has been sent",
            HTTP_STATUS.OK
        );
    }catch(err:any){
        console.error("Password reset request failed:", err?.message ?? err);
        return successResponse(
            res,
            null,
            "If this email exists, a reset code has been sent",
            HTTP_STATUS.OK
        );
    }
};

export const resetPasswordWithToken= async(
    req: Request, res: Response
)=>{
    try{
        const {token, newPassword} = req.body;

        if(!token || !newPassword){
            return errorResponse(
                res,
                "Token and new password are required",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (
            typeof newPassword !== "string" ||
            newPassword.length < 8 ||
            newPassword.length > 128
        ) {
            return errorResponse(
                res,
                "Password must be between 8 and 128 characters",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        await resetPasswordWithTokenService(token, newPassword);

        res.setHeader("Cache-Control", "no-store");
        return successResponse(
            res,
            null,
            "Password reset successfully",
            HTTP_STATUS.OK
        );
    }catch(err:any){
        if(err.message === "INVALID_OR_EXPIRED_TOKEN"){
            return errorResponse(
                res,
                "Reset link is invalid or expired",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        return errorResponse(
            res,
            "Password reset failed",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

export const verifyPasswordResetOtp = async (req: Request, res: Response) => {
    try {
        const email = typeof req.body?.email === "string" ? req.body.email : "";
        const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
        if (!email || !/^\d{6}$/.test(otp)) {
            return errorResponse(
                res,
                "Enter your email and the six-digit code",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const resetToken = await verifyPasswordResetOtpService(email, otp);
        res.setHeader("Cache-Control", "no-store");
        return successResponse(
            res,
            { resetToken },
            "Code verified",
            HTTP_STATUS.OK
        );
    } catch (err: any) {
        if (err.message === "INVALID_OR_EXPIRED_OTP") {
            return errorResponse(
                res,
                "The code is invalid or expired",
                HTTP_STATUS.BAD_REQUEST
            );
        }
        return errorResponse(
            res,
            "Code verification failed",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};
