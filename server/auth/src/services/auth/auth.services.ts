import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import prisma from "../../config/prisma";
import { Role } from "@prisma/client";

interface LoginResult{
    token: string;
    user:{
        id: number;
        email:string;
        role: Role;
    };
}

interface RegisterInput {
  email: string;
  password: string;
    businessId: number;
}

export const registerService = async ({
  email,
  password,
  businessId,
}: RegisterInput) => {

    try{

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
        data: {
            email,
            username: email,
            passwordHash: hashedPassword,
            role: Role.ADMIN,
            businessId
        },
        });

    const token = jwt.sign(
        {
        userId: user.id,
        businessId: user.businessId,
        role: user.role,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "30m" }
    );

    return {
        token,
        user: {
        id: user.id,
        email: user.email,
        role: user.role,
        },
    };
}catch(err:any){
    throw err;
}
};


export const LoginUser= async(
    email:string,
    password: string,
): Promise<LoginResult> =>{

    const user= await prisma.user.findUnique({
        where: {email},
    });

    console.log("Entered password:", password);
    console.log("Stored hash:", user!.passwordHash); 

    if(!user){
        throw new Error("INVALID_CREDENTIALS");
    }

    const isValid = await bcrypt.compare(password,user.passwordHash);

    if(!isValid){
        throw new Error("INVALID_PASSWORD")
    }

    if(!user.isActive){
        throw new Error("USER_DISABLED");
    }

    const token= jwt.sign({
        userId: user.id,
        businessId: user.businessId,
        role:user.role,
    },
    process.env.JWT_SECRET as string,
    {expiresIn : "30m"}
    );

    return{
        token,
        user:{
            id:user.id,
            email: user.email!,
            role: user.role,
        }
    }
};