import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
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
  businessName: string;
  address: string;
  email: string;
  password: string;
}

export const registerService = async ({
  businessName,
  address,
  email,
  password,
}: RegisterInput) => {

    try{

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {

        const business = await tx.business.create({
        data: {
            name: businessName,
            isActive: true,
            address,
        },
        });

        const user = await tx.user.create({
        data: {
            email,
            username: email,
            passwordHash: hashedPassword,
            role: Role.ADMIN,
            businessId: business.id,
        },
        });

        return { business, user };
    });

    const token = jwt.sign(
        {
        userId: result.user.id,
        businessId: result.user.businessId,
        role: result.user.role,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "30m" }
    );

    return {
        token,
        user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        businessId: result.user.businessId,
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
        include: {business:true},
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

    if(!user.business.isActive){
        throw new Error("BUSINESS_DISABLED");
    }

    const token= jwt.sign({
        userId: user.id,
        businessId: user.businessId,
        role:   user.role,
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
}