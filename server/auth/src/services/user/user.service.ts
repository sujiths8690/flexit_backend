import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendResetEmail } from "../mail/mail";
import prisma from "../../config/prisma";
import { Role } from "@prisma/client";

interface CreateUserInput {
    email: string;
    password: string;
    role: Role;
    businessId: number;
}

interface UpdateUserInput {
    id:number,
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    profileImageUrl?: string;
    password?: string;
    role?: Role;
    businessId: number;
}

interface ChangePasswordInput {
  userId: number;
  businessId: number;
  currentPassword: string;
  newPassword: string;
}

interface UpdateOwnProfileInput {
  userId: number;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImageUrl?: string;
}


export const createUserService= async({
    email,
    password,
    role,
    businessId
}: CreateUserInput)=>{

    const existing= await prisma.user.findFirst({
        where:{
            email,
            businessId,
        },
    });

    if(existing){
        throw new Error("USER_ALREADY_EXISTS")
    }

    const hashedPassword= await bcrypt.hash(password,12)

    const user= await prisma.user.create({
        data:{
            email,
            username:email,
            passwordHash: hashedPassword,
            role,
            businessId,
        }
    });

    return{
        id: user.id,
        username:user.username,
        email: user.email,
        role:  user.role,
    };
};

export const getUserService= async(
    id:number,
    businessId:number
)=> {
    const user= await prisma.user.findFirst({
        where:{
            id,
            businessId
        },
    });

    if(!user){
        throw new Error("USER_NOT_FOUND");
    }

    return user;
}

export const updateUserService= async({
    id,
    email,
    username,
    firstName,
    lastName,
    phone,
    profileImageUrl,
    role,
    businessId,
}: UpdateUserInput)=>{

    const user= await prisma.user.findFirst({
        where: {
            id,
            businessId
        }
    });

    if(!user){
        throw new Error("USER_NOT_FOUND")
    }

    if(role && user.role=== Role.ADMIN && role !== Role.ADMIN){
        throw new Error("CANNOT_DOWNGRADE_ADMIN")
    }

    return prisma.user.update({
        where:{id},
        data:{
            ...(email && {email}),
            ...(username && {username}),
            ...(firstName !== undefined && {firstName}),
            ...(lastName !== undefined && {lastName}),
            ...(phone !== undefined && {phone}),
            ...(profileImageUrl !== undefined && {profileImageUrl}),
            ...(role && {role})
        },
    });
};

const userResponse = (user: any) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    businessId: user.businessId,
});

export const getOwnProfileService = async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    return userResponse(user);
};

export const updateOwnProfileService = async ({
    userId,
    email,
    username,
    firstName,
    lastName,
    phone,
    profileImageUrl,
}: UpdateOwnProfileInput) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (email && email !== user.email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.id !== userId) {
            throw new Error("EMAIL_ALREADY_EXISTS");
        }
    }

    if (username && username !== user.username) {
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing && existing.id !== userId) {
            throw new Error("USERNAME_ALREADY_EXISTS");
        }
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(email !== undefined && { email }),
            ...(username !== undefined && { username }),
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(phone !== undefined && { phone }),
            ...(profileImageUrl !== undefined && { profileImageUrl }),
        },
    });

    return userResponse(updated);
};

export const verifyCurrentPasswordService = async (
    userId: number,
    currentPassword: string
) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
        throw new Error("INVALID_CURRENT_PASSWORD");
    }

    return true;
};

export const disableUserService= async(
    id:number,
    businessId: number
)=>{

    const user= await prisma.user.findFirst({
        where:{
            id,
            businessId,
        }
    });

    if(!user){
        throw new Error("USER_NOT_FOUND");
    }

    if(user.role === Role.ADMIN){
        throw new Error("CANNOT_DISABLE_ADMIN");
    }

    const disableUser=prisma.user.update({
        where:{id},
        data:{
            isActive: false,
        },
    });

    return disableUser;
};

export const enableUserService = async(
    id:number,
    businessId: number
)=>{

    const user= await prisma.user.findFirst({
        where:{
            id,
            businessId,
        }
    });

    if(!user){
        throw new Error ("USER_NOT_FOUND");
    }

    const enableUser= prisma.user.update({
        where:{
            id,
            businessId
        },
        data:{
            isActive: true,
        },
    });

    return enableUser;
};

export const changePasswordService= async({
    userId,
    businessId,
    currentPassword,
    newPassword,
}: ChangePasswordInput)=>{
    
    const user= await prisma.user.findFirst({
        where:{
            id:userId,
            businessId
        },
    });

    if(!user){
        throw new Error("USER_NOT_FOUND");
    }

    const isMatch= await bcrypt.compare(
        currentPassword,
        user.passwordHash
    );

    if(!isMatch){
        throw new Error("INVALID_CURRENT_PASSWORD");
    }

    const hashed= await bcrypt.hash(newPassword,12);

    const updatedUser= await prisma.user.update({
        where:{
            id: userId,
            businessId,
        },
        data:{
            passwordHash: hashed
        }
    });

    

    return updatedUser;
}

export const requestPasswordResetService= async(
    email:string
)=>{
    const user= await prisma.user.findFirst({
        where:{email}
    });

    if(!user) return;

    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash= crypto
        .createHash("sha256")
        .update( token)
        .digest("hex")

    await prisma.passwordResetToken.create({
        data:{
            tokenHash,
            userId: user.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        },
    });

    const resetLink = `${process.env.FRONTEND_URL || "texboard://reset-password"}?token=${token}`;

    await sendResetEmail(user.email!, resetLink);

    return token;
}

export const resetPasswordWithTokenService = async (
    token: string,
    newPassword: string
) => {
    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
            tokenHash,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
    });

    if (!resetToken) {
        throw new Error("INVALID_OR_EXPIRED_TOKEN");
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashed },
    });

    await prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId },
    });

    return true;
};
