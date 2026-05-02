import { Request, Response } from "express";
import {
    createCategoryService,
    updateCategoryService,
    deleteCategoryService,
    getCategoriesService
} from "../../services/category/categoryService";

import { successResponse, errorResponse } from "../../utils/response.helper";
import { HTTP_STATUS } from "../../utils/httpStatus";


/* ================================
   CREATE CATEGORY
================================ */
export const createCategoryController = async (req: Request, res: Response) => {
    try {
        const { name, position } = req.body;

        if (!name) {
            return errorResponse(
                res,
                "Category name is required",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const category = await createCategoryService({
            name,
            position,
            businessId: req.user!.businessId,
            userId: req.user!.userId
        });

        return successResponse(
            res,
            category,
            "Category created successfully",
            HTTP_STATUS.CREATED
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.BAD_REQUEST
        );
    }
};


/* ================================
   UPDATE CATEGORY
================================ */
export const updateCategoryController = async (req: Request, res: Response) => {
    try {
        const categoryId = Number(req.params.categoryId);
        const { name, position } = req.body;

        if (isNaN(categoryId)) {
            return errorResponse(
                res,
                "Invalid categoryId",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const category = await updateCategoryService({
            categoryId,
            name,
            position,
            businessId: req.user!.businessId,
            userId: req.user!.userId
        });

        return successResponse(
            res,
            category,
            "Category updated successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.BAD_REQUEST
        );
    }
};


/* ================================
   DELETE CATEGORY
================================ */
export const deleteCategoryController = async (req: Request, res: Response) => {
    try {
        const categoryId = Number(req.params.categoryId);

        if (isNaN(categoryId)) {
            return errorResponse(
                res,
                "Invalid categoryId",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const result = await deleteCategoryService(
            categoryId,
            req.user!.businessId,
            req.user!.userId
        );

        return successResponse(
            res,
            result,
            "Category deleted successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.BAD_REQUEST
        );
    }
};

/* ================================
   GET ALL CATEGORIES
================================ */
export const getCategoriesController = async (req: Request, res: Response) => {
    try {

        const categories = await getCategoriesService(
            req.user!.businessId
        );

        return successResponse(
            res,
            categories,
            "Categories fetched successfully",
            HTTP_STATUS.OK
        );

    } catch (error: any) {
        return errorResponse(
            res,
            error.message,
            HTTP_STATUS.BAD_REQUEST
        );
    }
};