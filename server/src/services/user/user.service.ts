import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import crypto from "crypto";
import { sendResetEmail } from "../../utils/mail";

interface CreateUserInput {
    email: string;
    password: string;
    role: Role;
    businessId: number;
}

interface UpdateUserInput {
    id:number,
    email?: string;
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
            ...(role && {role})
        },
    });
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

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendResetEmail(user.email!, resetLink);

    return token;
}