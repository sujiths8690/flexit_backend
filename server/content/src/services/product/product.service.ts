import prisma from "../../config/prisma";
import { VegType } from "@prisma/client";
import { logActivity } from "../../utils/activityClient";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";
import { invalidateMenuContentOverviewCache } from "../contentFeature/contentFeature.service";
import { broadcastBusinessDisplayConfigs } from "../../utils/deviceDisplayRealtime";


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
            position: product.position,
            isAvailable: product.isAvailable,
        }

        void invalidateMenuContentOverviewCache(businessId);
        sendRealtimeUpdate(
            businessId,
            "PRODUCT_CREATED",
            response
        );

        void broadcastBusinessDisplayConfigs(businessId);
         
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
        if (price !== undefined) {
            const nextPrice = Number(price);
            if (!Number.isFinite(nextPrice)) {
                throw new Error("INVALID_PRODUCT_PRICE");
            }
            updateData.price = nextPrice;
        }
        if (priceVariants !== undefined) {
            updateData.priceVariants = Array.isArray(priceVariants)
                ? priceVariants
                    .map((variant) => ({
                        label: variant.label,
                        price: Number(variant.price)
                    }))
                    .filter(
                        (variant) =>
                            typeof variant.label === "string" &&
                            variant.label.trim() &&
                            Number.isFinite(variant.price) &&
                            variant.price > 0
                    )
                : [];
        }
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
            position: updatedProduct.position,
            isAvailable: updatedProduct.isAvailable,
        }

        void invalidateMenuContentOverviewCache(businessId);
        sendRealtimeUpdate(
            businessId,
            "DEVICE_UPDATED",
            response
        );

        void broadcastBusinessDisplayConfigs(businessId);

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

const getProductDeleteImpactService = async (productId: number, businessId: number) => {
    try {
        if (!productId) {
            throw new Error("PRODUCT_ID_NOT_PROVIDED");
        }

        if (!businessId) {
            throw new Error("BUSINESS_ID_NOT_PROVIDED");
        }

        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                businessId,
                isActive: true
            },
            select: {
                id: true,
                name: true
            }
        });

        if (!product) {
            throw new Error("PRODUCT_NOT_FOUND");
        }

        const [discountOffers, freeOffers, comboOffers, todaysStars] = await Promise.all([
            prisma.offer.findMany({
                where: {
                    businessId,
                    isActive: true,
                    offerType: "discount",
                    items: {
                        some: {
                            productId
                        }
                    }
                },
                select: {
                    id: true,
                    name: true
                }
            }),
            prisma.offer.findMany({
                where: {
                    businessId,
                    isActive: true,
                    offerType: "free",
                    OR: [
                        { freeProductId: productId },
                        {
                            items: {
                                some: {
                                    OR: [
                                        { productId },
                                        { freeProductId: productId }
                                    ]
                                }
                            }
                        }
                    ]
                },
                select: {
                    id: true,
                    name: true
                }
            }),
            prisma.comboOffer.findMany({
                where: {
                    businessId,
                    isActive: true,
                    items: {
                        some: {
                            productId
                        }
                    }
                },
                select: {
                    id: true,
                    name: true
                }
            }),
            prisma.todaysStar.findMany({
                where: {
                    businessId,
                    productId
                },
                select: {
                    id: true,
                    starDate: true
                }
            })
        ]);

        return {
            product,
            discountOffers,
            freeOffers,
            comboOffers,
            todaysStars,
            summary: {
                discountOfferCount: discountOffers.length,
                freeOfferCount: freeOffers.length,
                comboOfferCount: comboOffers.length,
                todaysStarCount: todaysStars.length
            },
            hasImpact:
                discountOffers.length > 0 ||
                freeOffers.length > 0 ||
                comboOffers.length > 0 ||
                todaysStars.length > 0
        };
    } catch (error) {
        throw new Error(`ERROR_FETCHING_PRODUCT_DELETE_IMPACT ${error}`);
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

        const impact = await getProductDeleteImpactService(productId, businessId);
        const discountOfferIds = impact.discountOffers.map((offer) => offer.id);
        const freeOfferIds = impact.freeOffers.map((offer) => offer.id);
        const comboOfferIds = impact.comboOffers.map((offer) => offer.id);

        const result = await prisma.$transaction(async (tx) => {
            if (discountOfferIds.length > 0) {
                await tx.offerItem.deleteMany({
                    where: {
                        offerId: {
                            in: discountOfferIds
                        },
                        productId
                    }
                });

                const emptyDiscountOffers = await tx.offer.findMany({
                    where: {
                        id: {
                            in: discountOfferIds
                        },
                        businessId,
                        isActive: true,
                        items: {
                            none: {}
                        }
                    },
                    select: {
                        id: true
                    }
                });

                const emptyDiscountOfferIds = emptyDiscountOffers.map((offer) => offer.id);
                if (emptyDiscountOfferIds.length > 0) {
                    await tx.offer.updateMany({
                        where: {
                            id: {
                                in: emptyDiscountOfferIds
                            },
                            businessId
                        },
                        data: {
                            isActive: false
                        }
                    });
                }
            }

            if (freeOfferIds.length > 0) {
                await tx.offer.updateMany({
                    where: {
                        id: {
                            in: freeOfferIds
                        },
                        businessId
                    },
                    data: {
                        isActive: false
                    }
                });
            }

            if (comboOfferIds.length > 0) {
                await tx.comboOffer.updateMany({
                    where: {
                        id: {
                            in: comboOfferIds
                        },
                        businessId
                    },
                    data: {
                        isActive: false
                    }
                });
            }

            await tx.todaysStar.deleteMany({
                where: {
                    businessId,
                    productId
                }
            });

            const deleteProduct= await tx.product.update({
                where:{
                    id:productId,
                    businessId
                },
                data:{
                    isActive:false,
                }
            });

            return {
                deleteProduct
            };
        });

        logActivity(
            userId,
            businessId,
            "PRODUCT_DELETED",
            `Deleted product ${result.deleteProduct.name} with id ${result.deleteProduct.id}`
        )

        sendRealtimeUpdate(
            businessId,
            "DEVICE_DELETED",
            result.deleteProduct
        );
        sendRealtimeUpdate(
            businessId,
            "PRODUCT_DELETED",
            result.deleteProduct
        );
        if (impact.discountOffers.length > 0 || impact.freeOffers.length > 0) {
            sendRealtimeUpdate(
                businessId,
                "OFFERS_UPDATED",
                { productId, removed: impact.discountOffers, deleted: impact.freeOffers }
            );
        }
        if (impact.comboOffers.length > 0) {
            sendRealtimeUpdate(
                businessId,
                "COMBO_UPDATED",
                { productId, deleted: impact.comboOffers }
            );
        }
        if (impact.todaysStars.length > 0) {
            sendRealtimeUpdate(
                businessId,
                "TODAYS_STAR_UPDATED",
                { productId, deleted: impact.todaysStars }
            );
        }
        void invalidateMenuContentOverviewCache(businessId);

        void broadcastBusinessDisplayConfigs(businessId);

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
    getProductDeleteImpactService,
    getProductsByCategoryService
}
