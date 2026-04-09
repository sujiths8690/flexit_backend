import prisma from "../../config/prisma";
import { VegType } from "@prisma/client";
import { logActivity } from "../../utils/activityClient";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";


interface ProductInput{
    productId?: number,
    name: string;
    description?: string;
    price?: number;
    vegFlag?: VegType;
    imageUrl?: string;
    categoryId:number;
    businessId: number;
    position?: number;
    userId: number;
}

const createProductService= async({
    name,
    description,
    price,
    vegFlag="veg",
    categoryId,
    imageUrl,
    businessId,
    position=0,
    userId,
}: ProductInput)=>{
    try{
        if(categoryId){
            const category = await prisma.category.findFirst({
                where:{
                    id:categoryId,
                    businessId
                }
            });

            if(!category){
                throw new Error("INVALID_CATEGORY");
            }
        }

        const product = await prisma.product.create({
            data:{
                name,
                description,
                price,
                vegFlag,
                categoryId,
                imageUrl,
                isAvailable: true,
                position,
                businessId,
            },
        });

        logActivity(
            userId,
            businessId,
            "PRODUCT_CREATED",
            `Created product ${product.name}`
        )

        const response ={
            id: product.id,
            name: product.name,
            price: product.price,
            vegFlag: product.vegFlag,
            categoryId: product.categoryId,
            isAvailable: product.isAvailable,
        }

        sendRealtimeUpdate(
            businessId,
            "PRODUCT_CREATED",
            response
        );
         
        return response;
    }catch(error:any){
        throw new Error(`ERROR_OCCURED ${error}`)
    }
};

const updateProductService= async({
    productId,
    name,
    description,
    price,
    vegFlag,
    categoryId,
    imageUrl,
    businessId,
    position,
    userId,
}: ProductInput)=>{
    try{
        if(!productId){
            throw new Error("PRODUCT_ID_NOT_PROVIDED");
        }

        const existingProduct= await prisma.product.findFirst({
            where:{
                id: productId
            }
        });

        if(!existingProduct){
            throw new Error("PRODUCT_NOT_FOUND");
        }
        const changes: string[] = [];

        const updateData: any = {};

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price;
        if (vegFlag !== undefined) updateData.vegFlag = vegFlag;
        if (categoryId !== undefined) updateData.categoryId = categoryId;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (position !== undefined) updateData.position = position;

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: updateData
        });

        const changeDescription = changes.length > 0
            ? changes.join(", ")
            : "No fields changed";

        logActivity(
            userId,
            businessId,
            "PRODUCT_UPDATED",
            `Updated product ${updatedProduct.name}. Changes: ${changeDescription}`
        )

        const response ={
            id: updatedProduct.id,
            name: updatedProduct.name,
            price: updatedProduct.price,
            vegFlag: updatedProduct.vegFlag,
            categoryId: updatedProduct.categoryId,
            isAvailable: updatedProduct.isAvailable,
        }

        sendRealtimeUpdate(
            businessId,
            "DEVICE_UPDATED",
            response
        );

        return response;

    }catch(error){
        throw new Error(`ERROR_UPDATING_PRODUCT ${error}`)
    }
}

const getAllProductService=async(businessId: number)=>{
    try{
        const products= await prisma.product.findMany({
            where:{
                businessId
            }
        });

        if(products.length === 0){
            throw new Error("NO_PRODUCTS_ADDED");
        }

        return products;
    }catch(error){
        throw new Error(`ERROR_FETCHING_ALL_PRODUCTS ${error}`)
    }
};

const getOneProductService= async(productId:number, businessId:number)=>{
    try{
        if(!productId){
            throw new Error("PRODUCT_ID_NOT_PROVIDED");
        }

        const product= await prisma.product.findFirst({
            where:{
                id:productId,
                businessId
            }
        });

        return product;
    }catch(error){
        throw new Error(`ERROR_FETCHING_PRODUCT ${error}`)
    }
};

const deleteProductService= async(productId:number, businessId:number, userId:number)=>{
    try{
        if(!productId){
            throw new Error("PRODUCT_ID_NOT_PROVIDED");
        }

        if(!businessId){
            throw new Error("BUSINESS_ID_NOT_PROVIDED");
        }

        const deleteProduct= await prisma.product.update({
            where:{
                id:productId,
                businessId
            },
            data:{
                isActive:false,
            }
        });

        logActivity(
            userId,
            businessId,
            "PRODUCT_DELETED",
            `Deleted product ${deleteProduct.name} with id ${deleteProduct.id}`
        )

        sendRealtimeUpdate(
            businessId,
            "DEVICE_DELETED",
            deleteProduct
        );

    }catch(error){
        throw new Error(`ERROR_DELETING_PRODUCT ${error}`)
    }
}

export{
    createProductService,
    updateProductService,
    getAllProductService,
    getOneProductService,
    deleteProductService
}