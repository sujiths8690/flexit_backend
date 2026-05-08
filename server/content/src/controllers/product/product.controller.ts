import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";

import {
    createProductService,
    deleteProductService,
    getAllProductService,
    getOneProductService,
    getProductsByCategoryService,
    updateProductService
} from "../../services/product/product.service";


/* ================================
   CREATE PRODUCT
================================ */
export const createProduct = async (req: Request, res: Response) => {
    try {
        const {
            name,
            description,
            price,
            priceVariants,
            vegFlag,
            imageUrl,
            categoryId,
            position,
            isAvailable
        } = req.body;

        if (!name || !categoryId) {
            return errorResponse(
                res,
                "Name and category are required",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const product = await createProductService({
            name,
            description,
            price,
            priceVariants,
            vegFlag,
            imageUrl,
            categoryId,
            businessId: req.user!.businessId,
            position,
            userId: req.user!.userId,
            isAvailable
        });

        return successResponse(
            res,
            product,
            "Product created successfully",
            HTTP_STATUS.CREATED
        );

    } catch (error: any) {

        if (error.message.includes("INVALID_CATEGORY")) {
            return errorResponse(res, error.message, HTTP_STATUS.BAD_REQUEST);
        }

        return errorResponse(
            res,
            error.message || "Failed to create product",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};


/* ================================
   UPDATE PRODUCT
================================ */
export const updateProduct = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId);

        if (isNaN(productId)) {
            return errorResponse(
                res,
                "Invalid productId",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const {
            name,
            description,
            price,
            priceVariants,
            vegFlag,
            imageUrl,
            categoryId,
            position,
            isAvailable
        } = req.body;

        const product = await updateProductService({
            productId,
            name,
            description,
            price,
            priceVariants,
            vegFlag,
            imageUrl,
            categoryId,
            position,
            businessId: req.user!.businessId,
            userId: req.user!.userId,
            isAvailable
        });

        return successResponse(
            res,
            product,
            "Product updated successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {

        if (error.message.includes("PRODUCT_NOT_FOUND")) {
            return errorResponse(res, error.message, HTTP_STATUS.NOT_FOUND);
        }

        return errorResponse(
            res,
            error.message || "Failed to update product",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};


/* ================================
   GET ALL PRODUCTS
================================ */
export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const products = await getAllProductService(
            req.user!.businessId
        );

        return successResponse(
            res,
            products,
            "Products fetched successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message || "Failed to fetch products",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};

/* ================================
   GET PRODUCTS BY CATEGORY
================================ */
export const getProductsByCategory = async (req: Request, res: Response) => {
    try {
        const categoryId = Number(req.params.categoryId);

        if (isNaN(categoryId)) {
            return errorResponse(
                res,
                "Invalid categoryId",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const products = await getProductsByCategoryService(
            req.user!.businessId,
            categoryId
        );

        return successResponse(
            res,
            products,
            "Products fetched successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message || "Failed to fetch products",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};


/* ================================
   GET ONE PRODUCT
================================ */
export const getOneProduct = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId);

        if (isNaN(productId)) {
            return errorResponse(
                res,
                "Invalid product id",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const product = await getOneProductService(
            productId,
            req.user!.businessId
        );

        if (!product) {
            return errorResponse(
                res,
                "Product not found",
                HTTP_STATUS.NOT_FOUND
            );
        }

        return successResponse(
            res,
            product,
            "Product fetched successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message || "Failed to fetch product",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};


/* ================================
   DELETE PRODUCT
================================ */
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId);

        if (isNaN(productId)) {
            return errorResponse(
                res,
                "Invalid product id",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        await deleteProductService(
            productId,
            req.user!.businessId,
            req.user!.userId
        );

        return successResponse(
            res,
            null,
            "Product deleted successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {

        if (error.message.includes("PRODUCT_NOT_FOUND")) {
            return errorResponse(res, error.message, HTTP_STATUS.NOT_FOUND);
        }

        return errorResponse(
            res,
            error.message || "Failed to delete product",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
};
