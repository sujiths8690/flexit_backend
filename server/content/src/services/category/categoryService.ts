
import prisma from "../../config/prisma";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";
import { invalidateMenuContentOverviewCache } from "../contentFeature/contentFeature.service";
import { broadcastBusinessDisplayConfigs } from "../../utils/deviceDisplayRealtime";

interface CategoryInput {
    categoryId?: number;
    name?: string;
    position?: number;
    businessId: number;
    userId: number;
}

/* ================================
   CREATE CATEGORY
================================ */
const createCategoryService = async ({
    name,
    position = 0,
    businessId,
    userId
}: CategoryInput) => {

    try {

        if (!name) {
            throw new Error("CATEGORY_NAME_REQUIRED");
        }

        // 🔥 Normalize name (avoid "Burger" vs "burger")
        const normalizedName = name.trim().toLowerCase();

        // 🔍 Check duplicate
        const existing = await prisma.category.findFirst({
            where: {
                businessId,
                name: normalizedName,
            },
        });

        if (existing) {
            throw new Error("CATEGORY_ALREADY_EXISTS");
        }

        const category = await prisma.category.create({
            data: {
                name: normalizedName,
                position,
                businessId,
            },
        });

        // await prisma.userActivity.create({
        //     data: {
        //         businessId,
        //         userId,
        //         userActivityType: "CREATED_CATEGORY",
        //         UserActivityDesc: `Created category ${category.name}`
        //     }
        // });

        sendRealtimeUpdate(
            businessId,
            "CATEGORY_CREATED",
            category
        );
        void invalidateMenuContentOverviewCache(businessId);

        void broadcastBusinessDisplayConfigs(businessId);

        return category;

    } catch (error: any) {
        throw new Error(`ERROR_CREATING_CATEGORY: ${error.message}`);
    }
};


/* ================================
   UPDATE CATEGORY
================================ */
const updateCategoryService = async ({
  categoryId,
  name,
  position,
  businessId,
  userId
}: CategoryInput) => {

  try {

    if (!categoryId) {
      throw new Error("CATEGORY_ID_REQUIRED");
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        businessId
      }
    });

    if (!existingCategory) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    // 🔥 DUPLICATE CHECK (ONLY IF NAME IS BEING UPDATED)
    if (name !== undefined) {

      const normalizedName = name.trim().toLowerCase();

      const duplicate = await prisma.category.findFirst({
        where: {
          businessId,
          name: normalizedName,
          NOT: {
            id: categoryId // exclude current category
          }
        }
      });

      if (duplicate) {
        throw new Error("CATEGORY_ALREADY_EXISTS");
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined && { name: name.trim().toLowerCase() }),
        ...(position !== undefined && { position })
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true
              }
            }
          }
        }
      }
    });

    const response = {
      id: updatedCategory.id,
      name: updatedCategory.name,
      position: updatedCategory.position,
      productCount: updatedCategory._count.products
    };

    sendRealtimeUpdate(
      businessId,
      "CATEGORY_UPDATED",
      response
    );
    void invalidateMenuContentOverviewCache(businessId);

    void broadcastBusinessDisplayConfigs(businessId);

    return response;

  } catch (error: any) {
    throw new Error(`ERROR_UPDATING_CATEGORY: ${error.message}`);
  }
};

/* ================================
   DELETE CATEGORY
================================ */
const deleteCategoryService = async (
    categoryId: number,
    businessId: number,
    userId: number
) => {

    try {

        if (!categoryId) {
            throw new Error("CATEGORY_ID_REQUIRED");
        }

        const existingCategory = await prisma.category.findFirst({
            where: {
                id: categoryId,
                businessId
            },
            include: {
                products: true
            }
        });

        if (!existingCategory) {
            throw new Error("CATEGORY_NOT_FOUND");
        }

        if (existingCategory.products.length > 0) {
            throw new Error("CATEGORY_HAS_PRODUCTS");
        }

        await prisma.category.delete({
            where: { id: categoryId }
        });

        // await prisma.userActivity.create({
        //     data: {
        //         businessId,
        //         userId,
        //         userActivityType: "DELETED_CATEGORY",
        //         UserActivityDesc: `Deleted category ${existingCategory.name}`
        //     }
        // });

        sendRealtimeUpdate(
            businessId,
            "CATEGORY_DELETED",
            { id: categoryId }
        );
        void invalidateMenuContentOverviewCache(businessId);

        void broadcastBusinessDisplayConfigs(businessId);

        return { success: true };

    } catch (error: any) {
        throw new Error(`ERROR_DELETING_CATEGORY: ${error.message}`);
    }
};

const getCategoriesService = async (businessId: number) => {
  const categories = await prisma.category.findMany({
    where: { businessId },
    orderBy: { position: "asc" },
    include: {
      _count: {
        select: {
          products: {
            where:{
              isActive: true
            }
          }
        },
      },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    position: c.position,
    productCount: c._count.products, // 🔥 THIS LINE IS THE KEY
  }));
};


export {
    createCategoryService,
    updateCategoryService,
    deleteCategoryService,
    getCategoriesService
};
