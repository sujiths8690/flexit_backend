import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../utils/response.helper";
import { createProductService, deleteProductService, getAllProductService, getOneProductService, updateProductService } from "../../services/product/product.service";

export const createProduct= async(req: Request, res:Response)=>{
    try{
        const{
            name,
            description,
            price,
            vegFlag,
            imageUrl,
            categoryId,
            position,
        }= req.body;

        if(!name  || !categoryId){
            return errorResponse(
                res,
                "Name and category are required",
                400
            );
        }

        const product= await createProductService({
            name,
            description,
            price,
            vegFlag,
            imageUrl,
            categoryId,
            businessId: req.businessId!,
            position,
            userId: req.user?.userId!,
        });

        return successResponse(
            res,
            product,
            "Product created successfully!"
        );

    }catch(error:any){
        return errorResponse(
            res,
            error.message || "Failed to create product",
            500
        );
    }
};

export const updateProduct= async(req: Request, res: Response)=>{
    try{
        const{
            name,
            description,
            price,
            vegFlag,
            imageUrl,
            categoryId,
            position,
        }= req.body;

        const product= await updateProductService({
            name,
            description,
            price,
            vegFlag,
            imageUrl,
            categoryId,
            position,
            businessId: req.businessId!,
            userId: req.user?.userId!,
        });

        return successResponse(
            res,
            product,
            "Product updated successfully!"
        );
    }catch(error:any){
        return errorResponse(
            res,
            error.message || "Failed to update product",
            500
        );
    }
};

export const getAllProducts= async(req: Request, res: Response)=>{
    try{
        const products= await getAllProductService(req.businessId!);

        return successResponse(
            res,
            products,
            "Products fetched successfully!"
        );
    }catch(error:any){
        return errorResponse(
            res,
            error.message || "Failed to fetch products",
            500
        );
    }   
};

export const getOneProduct= async(req: Request, res: Response)=>{
    try{
        const productId= Number(req.params.productId);

        if(isNaN(productId)){
            return errorResponse(
                res,
                "Invalid product id",
                400
            );
        }
        const product= await getOneProductService(productId, req.businessId!);

        return successResponse(
            res,
            product,
            "Product fetched successfully!"
        );
    }catch(error:any){
        return errorResponse(
            res,
            error.message || "Failed to fetch product",
            500
        );
    }
};

export const deleteProduct= async(req: Request, res: Response)=>{
    try{
        const productId= Number(req.params.productId);

        if(isNaN(productId)){
            return errorResponse(
                res,
                "Invalid product id",
                400
            );
        }

        await deleteProductService(Number(productId), req.businessId!, req.user?.userId!);

        return successResponse(
            res,
            null,
            "Product deleted successfully!"
        );
    }catch(error:any){
        return errorResponse(
            res,
            error.message || "Failed to delete product",
            500
        );
    }
};