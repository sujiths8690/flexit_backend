import prisma from "../../config/prisma";
import { VegType } from "@prisma/client";
import { logActivity } from "../../utils/activityClient";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";


interface ProductInput{
    productId?: number,
    name: string;
    description?: string;
    price?: number;
    priceVariants?: { label: string; price: number }[];
    vegFlag?: VegType;
    imageUrl?: string;
    categoryId:number;
    businessId: number;
    position?: number;
    userId: number;
    isAvailable: boolean;
}

const createProductService= async({
    name,
    description,
    price,
    priceVariants,
    vegFlag="veg",
    categoryId,
    imageUrl,
    businessId,
    position=0,
    userId,
    isAvailable
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
                priceVariants: priceVariants ?? undefined,
                vegFlag,
                categoryId,
                imageUrl,
                isAvailable,
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

        const response = {
            id: product.id,
            name: product.name,
            description: product.description,   // 🔥 ADD
            imageUrl: product.imageUrl,         // 🔥 ADD
            price: product.price,
            priceVariants: (product as any).priceVariants,
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
    priceVariants,
    vegFlag,
    categoryId,
    imageUrl,
    businessId,
    position,
    userId,
    isAvailable
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
        if (priceVariants !== undefined) updateData.priceVariants = priceVariants;
        if (vegFlag !== undefined) updateData.vegFlag = vegFlag;
        if (categoryId !== undefined) updateData.categoryId = categoryId;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (position !== undefined) updateData.position = position;
        if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

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

        const response = {
            id: updatedProduct.id,
            name: updatedProduct.name,
            description: updatedProduct.description,   // 🔥 ADD
            imageUrl: updatedProduct.imageUrl,         // 🔥 ADD
            price: updatedProduct.price,
            priceVariants: (updatedProduct as any).priceVariants,
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

const getAllProductService = async (businessId: number) => {
    try {
        const products = await prisma.product.findMany({
            where: {
                businessId
            }
        });

        // ❌ REMOVE THIS
        // if(products.length === 0){
        //     throw new Error("NO_PRODUCTS_ADDED");
        // }

        // ✅ RETURN EMPTY ARRAY INSTEAD
        return products;

    } catch (error) {
        throw new Error(`ERROR_FETCHING_ALL_PRODUCTS ${error}`);
    }
};

const getProductsByCategoryService = async (
  businessId: number,
  categoryId: number
) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        businessId,
        categoryId,
        isActive: true,   // 🔥 important
      },
      orderBy: {
        position: 'asc', // optional but good
      },
    });

    return products;
  } catch (error) {
    throw new Error(`ERROR_FETCHING_PRODUCTS_BY_CATEGORY ${error}`);
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
    deleteProductService,
    getProductsByCategoryService
}
