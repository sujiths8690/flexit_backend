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

const adminUserResponse = (user: any) => {
    const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        businessId: user.businessId,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        name: fullName || user.username || user.email || `User ${user.id}`,
        status: user.isActive ? "Active" : "Banned",
    };
};

export const getAdminUserSummaryService = async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, activeUsers, newUsersThisMonth] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    return {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
    };
};

export const listAdminUsersService = async ({
    search,
    status,
}: {
    search?: string;
    status?: string;
}) => {
    const trimmedSearch = search?.trim();
    const normalizedStatus = status?.trim().toLowerCase();
    const where: any = {};

    if (trimmedSearch) {
        const idSearch = Number(trimmedSearch);
        where.OR = [
            { username: { contains: trimmedSearch } },
            { email: { contains: trimmedSearch } },
            { firstName: { contains: trimmedSearch } },
            { lastName: { contains: trimmedSearch } },
            ...(Number.isNaN(idSearch) ? [] : [{ id: idSearch }]),
        ];
    }

    if (normalizedStatus === "active") {
        where.isActive = true;
    } else if (normalizedStatus === "banned") {
        where.isActive = false;
    } else if (normalizedStatus === "flagged") {
        return [];
    }

    const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    return users.map(adminUserResponse);
};


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
    const normalizedEmail = email.trim().toLowerCase();
    const user= await prisma.user.findFirst({
        where:{email: normalizedEmail}
    });

    if(!user) return;

    const otp = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = passwordResetHash(otp);

    await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
    });

    await prisma.passwordResetToken.create({
        data:{
            tokenHash,
            userId: user.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 10),
        },
    });

    const resetLink = `${(process.env.FRONTEND_URL || "https://flexit.online").replace(/\/$/, "")}/reset-password`;

    await sendResetEmail(user.email!, otp, resetLink);
}

const passwordResetHash = (value: string) => {
    const secret = process.env.PASSWORD_RESET_SECRET;
    if (!secret) throw new Error("PASSWORD_RESET_SECRET_NOT_CONFIGURED");
    return crypto.createHmac("sha256", secret).update(value).digest("hex");
};

export const verifyPasswordResetOtpService = async (
    email: string,
    otp: string
) => {
    const user = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase() },
        select: { id: true },
    });
    if (!user) throw new Error("INVALID_OR_EXPIRED_OTP");

    const resetRequest = await prisma.passwordResetToken.findFirst({
        where: {
            userId: user.id,
            verifiedAt: null,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
    });
    if (!resetRequest || resetRequest.attemptCount >= 5) {
        throw new Error("INVALID_OR_EXPIRED_OTP");
    }

    const candidateHash = passwordResetHash(otp);
    const expected = Buffer.from(resetRequest.tokenHash, "hex");
    const candidate = Buffer.from(candidateHash, "hex");
    const matches = expected.length === candidate.length &&
        crypto.timingSafeEqual(expected, candidate);

    if (!matches) {
        const updated = await prisma.passwordResetToken.update({
            where: { id: resetRequest.id },
            data: { attemptCount: { increment: 1 } },
        });
        if (updated.attemptCount >= 5) {
            await prisma.passwordResetToken.delete({ where: { id: updated.id } });
        }
        throw new Error("INVALID_OR_EXPIRED_OTP");
    }

    const resetToken = crypto.randomBytes(32).toString("base64url");
    await prisma.passwordResetToken.update({
        where: { id: resetRequest.id },
        data: {
            tokenHash: passwordResetHash(resetToken),
            verifiedAt: new Date(),
            expiresAt: new Date(Date.now() + 1000 * 60 * 10),
        },
    });
    return resetToken;
};

export const resetPasswordWithTokenService = async (
    token: string,
    newPassword: string
) => {
    const tokenHash = passwordResetHash(token);

    const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
            tokenHash,
            verifiedAt: { not: null },
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
    });

    if (!resetToken) {
        throw new Error("INVALID_OR_EXPIRED_TOKEN");
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: resetToken.userId },
            data: { passwordHash: hashed },
        }),
        prisma.passwordResetToken.deleteMany({
            where: { userId: resetToken.userId },
        }),
    ]);

    return true;
};
