import { VegType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import * as webSocketService from "../../websockets/websocketService";


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

        await prisma.userActivity.create({
            data:{
                businessId,
                userId,
                userActivityType: "CREATED_PRODUCT",
                UserActivityDesc: `Created product ${product.name} with id ${product.id}`
            }
        });

        const response ={
            id: product.id,
            name: product.name,
            price: product.price,
            vegFlag: product.vegFlag,
            catgoryId: product.categoryId,
            isAvailable: product.isAvailable,
        }

        webSocketService.broadcastToBusiness(
            businessId,
            {type: "PRODUCT_CREATED",
            data: response}
        )
         
        return response;
    }catch(error){
        throw new Error("ERROR_OCCURED")
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
        if(productId){
            const product= await prisma.product.findFirst({
                where:{
                    id:productId
                }
            });

            if(!product){
                throw new Error("PRODUCT_NOT_FOUND");
            }
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

        if (name !== undefined && name !== existingProduct.name) {
            changes.push(`name: "${existingProduct.name}" → "${name}"`);
        }

        if (
            price !== undefined &&
            price !== existingProduct.price.toNumber()
            ) {
            changes.push(`price: ${existingProduct.price} → ${price}`);
        }

        if (vegFlag !== undefined && vegFlag !== existingProduct.vegFlag) {
            changes.push(`vegFlag: ${existingProduct.vegFlag} → ${vegFlag}`);
        }

        if (categoryId !== undefined && categoryId !== existingProduct.categoryId) {
            changes.push(`categoryId: ${existingProduct.categoryId} → ${categoryId}`);
        }

        if (position !== undefined && position !== existingProduct.position) {
            changes.push(`position: ${existingProduct.position} → ${position}`);
        }


        const updatedProduct= await prisma.product.update({
            where:{
                id:productId
            },
            data:{
                name,
                description,
                price,
                vegFlag,
                categoryId,
                imageUrl,
                businessId,
                position
            }
        });

        const changeDescription = changes.length > 0
            ? changes.join(", ")
            : "No fields changed";

        await prisma.userActivity.create({
            data:{
                userId,
                businessId,
                userActivityType: "UPDATED_PRODUCT",
                 UserActivityDesc: `Updated product ${updatedProduct.name}. Changes: ${changeDescription}`
            }
        })

        const response ={
            id: updatedProduct.id,
            name: updatedProduct.name,
            price: updatedProduct.price,
            vegFlag: updatedProduct.vegFlag,
            categoryId: updatedProduct.categoryId,
            isAvailable: updatedProduct.isAvailable,
        }

        webSocketService.broadcastToBusiness(
            businessId,
            {type: "PRODUCT_UPDATED",
            data: response}
        )

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

        if(!products){
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

        await prisma.userActivity.create({
            data:{
                businessId,
                userId,
                userActivityType: "DELETED_PRODUCT",
                UserActivityDesc: `Deleted product ${deleteProduct.name} with id ${deleteProduct.id}`
            }
        })
        webSocketService.broadcastToBusiness(
            businessId,
            {type: "PRODUCT_DELETED",
                data:{deleteProduct}
            }
        )
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