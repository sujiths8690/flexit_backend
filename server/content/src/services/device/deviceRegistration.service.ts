import prisma from "../../config/prisma";
import { logActivity } from "../../utils/activityClient";
import { sendRealtimeUpdate } from "../../utils/realtimeClient";

interface DeviceInput {
    deviceId?: number;
    name?: string;
    deviceCode?: string;
    businessId: number;
    userId: number;
}

interface DeviceConfigInput {
    deviceId: number;
    businessId: number;
    userId: number;
    name?: string;
    orientation?: string;
    menuTheme?: string;
    themeColor?: string;
    displayContentMode?: string;
    selectedCategoryId?: number | null;
    selectedMediaId?: number | null;
    transitionStyle?: string;
    transitionSpeedSeconds?: number;
    autoScrollIntervalSeconds?: number;
}

const allowedOrientations = new Set(["normal", "left", "right", "inverted"]);
const allowedMenuThemes = new Set([
    "light",
    "dark",
    "warm",
    "neon",
    "mint",
    "ocean",
    "sunrise",
    "royal",
    "paper",
    "graphite"
]);
const allowedThemeColors = new Set([
    "gold",
    "green",
    "blue",
    "rose",
    "purple",
    "orange",
    "teal",
    "slate"
]);
const allowedContentModes = new Set([
    "allCategories",
    "category",
    "allMedia",
    "media",
    "comboOffers",
    "todaysStar"
]);
const allowedTransitionStyles = new Set(["fade", "slide", "zoom", "flip"]);

const normalizeDisplaySetting = (value?: string) =>
    typeof value === "string" ? value.trim().toLowerCase() : value;

const normalizeDeviceName = (value?: string | null) =>
    typeof value === "string" ? value.trim() : "";

const findDuplicateDeviceName = async (
    businessId: number,
    name: string,
    excludeDeviceId?: number
) => {
    const normalized = name.trim().toLowerCase();
    const devices = await prisma.device.findMany({
        where: {
            businessId,
            isActive: true,
            ...(excludeDeviceId ? { id: { not: excludeDeviceId } } : {})
        },
        select: {
            id: true,
            name: true
        }
    });

    return devices.find(
        (device) => (device.name ?? "").trim().toLowerCase() === normalized
    );
};

const mediaUrl = (url?: string | null) => {
    if (!url) return null;
    const normalized = url.replace(/\\/g, "/");
    return normalized.startsWith("http") ? normalized : `/${normalized}`;
};

const mediaType = (type: string) => type.toLowerCase();

const productCategory = (product: any) => {
    if (product.category) {
        return {
            id: product.category.id,
            name: product.category.name
        };
    }
    return {
        id: product.categoryId,
        name: "menu"
    };
};

const serializeProduct = (product: any) => {
    const category = productCategory(product);
    const isTodaysStar = Boolean(product.isTodaysStar);
    return {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: Number(product.price),
        priceVariants: product.priceVariants ?? [],
        imageUrl: mediaUrl(product.imageUrl),
        category: isTodaysStar ? "todaysStar" : product.vegFlag === "non_veg" ? "nonVeg" : "veg",
        categoryId: category.id,
        categoryName: category.name,
        isAvailable: product.isAvailable,
        isFeatured: isTodaysStar,
        tags: []
    };
};

const serializeMedia = (media: any) => ({
    id: media.id,
    fileName: media.fileName,
    url: mediaUrl(media.url),
    type: mediaType(media.type)
});

const serializeComboOffer = (combo: any) => {
    const comboItems = (combo.items ?? []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity ?? 1,
        variantLabel: item.variantLabel ?? null,
        variantPrice: item.variantPrice === null || item.variantPrice === undefined ? null : Number(item.variantPrice),
        product: item.product ? serializeProduct(item.product) : null
    })).filter((item: any) => item.product !== null);
    const originalPrice = (combo.items ?? []).reduce(
        (total: number, item: any) =>
            total + Number(item.variantPrice ?? item.product?.price ?? 0) * Number(item.quantity ?? 1),
        0
    );

    return {
        id: `combo-${combo.id}`,
        name: combo.name,
        description: combo.description,
        price: combo.price === null || combo.price === undefined ? 0 : Number(combo.price),
        priceVariants: [],
        imageUrl: mediaUrl(combo.imageUrl),
        category: "all",
        categoryId: null,
        categoryName: "Combo Offers",
        isAvailable: true,
        isFeatured: true,
        tags: ["combo"],
        originalPrice,
        comboItems,
        items: comboItems
    };
};

/* ================================
   REGISTER DEVICE
================================ */
const registerDeviceService = async ({
    name,
    businessId,
    userId
}: DeviceInput) => {

    try {

        // 1. Check business exists
        const business = await prisma.business.findUnique({
            where: { id: businessId }
        });

        if (!business) {
            throw new Error("BUSINESS_NOT_FOUND");
        }

        // 2. Generate unique deviceCode
        const deviceCode = "DEV-" + Math.random().toString(36).substring(2, 10);

        // 3. Create device
        const device = await prisma.device.create({
            data: {
                name,
                businessId,
                deviceCode
            }
        });


        logActivity(
            userId,
            businessId,
            "CREATED_DEVICE",
            `Registered device ${device.name || "Unnamed"} with code ${device.deviceCode}`
        )

        // 5. WebSocket broadcast (optional)
        sendRealtimeUpdate(
            businessId,
            "DEVICE_CREATED",
            device.deviceCode
        );

        return {
            id: device.id,
            name: device.name,
            deviceCode: device.deviceCode
        };

    } catch (error: any) {
        throw new Error(`ERROR_CREATING_DEVICE: ${error.message}`);
    }
};


/* ================================
   PAIR DEVICE BY DISPLAY CODE
================================ */
const pairDeviceByCodeService = async ({
    deviceCode,
    name,
    businessId,
    userId
}: DeviceInput) => {

    try {

        if (!deviceCode) {
            throw new Error("DEVICE_CODE_REQUIRED");
        }

        const normalizedCode = deviceCode.trim().toUpperCase();

        const business = await prisma.business.findUnique({
            where: { id: businessId }
        });

        if (!business) {
            throw new Error("BUSINESS_NOT_FOUND");
        }

        const normalizedName = normalizeDeviceName(name);
        const existingDevice = await prisma.device.findUnique({
            where: { deviceCode: normalizedCode }
        });

        if (existingDevice && existingDevice.businessId !== businessId) {
            throw new Error("DEVICE_ALREADY_PAIRED");
        }

        const duplicateName = normalizedName
            ? await findDuplicateDeviceName(
                businessId,
                normalizedName,
                existingDevice?.id
            )
            : null;

        if (duplicateName) {
            throw new Error("DEVICE_NAME_ALREADY_EXISTS");
        }

        const device = existingDevice
            ? await prisma.device.update({
                where: { id: existingDevice.id },
                data: {
                    name: normalizedName || existingDevice.name || `Display ${normalizedCode.slice(0, 4)}`
                }
            })
            : await prisma.device.create({
                data: {
                    name: normalizedName || `Display ${normalizedCode.slice(0, 4)}`,
                    businessId,
                    deviceCode: normalizedCode
                }
            });

        logActivity(
            userId,
            businessId,
            "PAIRED_DEVICE",
            `Paired display device with code ${device.deviceCode}`
        );

        sendRealtimeUpdate(
            businessId,
            "DEVICE_PAIRED",
            device.deviceCode
        );

        return {
            id: device.id,
            name: device.name,
            deviceCode: device.deviceCode,
            mode: device.displayMode,
            orientation: (device as any).orientation ?? "normal",
            menuTheme: (device as any).menuTheme ?? "light",
            themeColor: (device as any).themeColor ?? "gold",
            displayContentMode: (device as any).displayContentMode ?? "allCategories",
            selectedCategoryId: (device as any).selectedCategoryId ?? null,
            selectedMediaId: (device as any).selectedMediaId ?? null,
            transitionStyle: (device as any).transitionStyle ?? "fade",
            transitionSpeedSeconds: (device as any).transitionSpeedSeconds ?? 0.5,
            autoScrollIntervalSeconds:
                (device as any).autoScrollIntervalSeconds ?? 8,
            online: true,
            createdAt: device.createdAt
        };

    } catch (error: any) {
        throw new Error(`ERROR_PAIRING_DEVICE: ${error.message}`);
    }
};

/* ================================
   LIST DEVICES FOR BUSINESS
================================ */
const listDevicesByBusinessService = async (businessId: number) => {

    try {

        const devices = await prisma.device.findMany({
            where: {
                businessId,
                isActive: true
            },
            orderBy: { createdAt: "desc" }
        });

        return devices.map((device) => ({
            id: device.id,
            name: device.name,
            deviceCode: device.deviceCode,
            mode: device.displayMode,
            orientation: (device as any).orientation ?? "normal",
            menuTheme: (device as any).menuTheme ?? "light",
            themeColor: (device as any).themeColor ?? "gold",
            displayContentMode: (device as any).displayContentMode ?? "allCategories",
            selectedCategoryId: (device as any).selectedCategoryId ?? null,
            selectedMediaId: (device as any).selectedMediaId ?? null,
            transitionStyle: (device as any).transitionStyle ?? "fade",
            transitionSpeedSeconds: (device as any).transitionSpeedSeconds ?? 0.5,
            autoScrollIntervalSeconds:
                (device as any).autoScrollIntervalSeconds ?? 8,
            online: true,
            createdAt: device.createdAt
        }));

    } catch (error: any) {
        throw new Error(`ERROR_FETCHING_DEVICES: ${error.message}`);
    }
};


/* ================================
   PUBLIC DISPLAY CONFIG LOOKUP
================================ */
const getDeviceConfigByCodeService = async (deviceCode: string) => {

    try {

        if (!deviceCode) {
            throw new Error("DEVICE_CODE_REQUIRED");
        }

        const normalizedCode = deviceCode.trim().toUpperCase();

        const device = await prisma.device.findUnique({
            where: { deviceCode: normalizedCode },
            include: { business: true }
        });

        if (!device) {
            return {
                deviceCode: normalizedCode,
                isPaired: false,
                orientation: "normal",
                displayConfig: null
            };
        }

        const contentMode = (device as any).displayContentMode ?? "allCategories";
        const selectedCategoryId = (device as any).selectedCategoryId ?? null;
        const selectedMediaId = (device as any).selectedMediaId ?? null;
        const transitionStyle = (device as any).transitionStyle ?? "fade";
        const transitionSpeedSeconds = (device as any).transitionSpeedSeconds ?? 0.5;
        const interval = (device as any).autoScrollIntervalSeconds ?? 8;
        const isMediaMode = contentMode === "allMedia" || contentMode === "media";
        const isComboMode = contentMode === "comboOffers";
        const isTodaysStarMode = contentMode === "todaysStar";
        const mediaWhere: any = { businessId: device.businessId };
        if (contentMode === "media" && selectedMediaId) {
            mediaWhere.id = selectedMediaId;
        }
        const productWhere: any = {
            businessId: device.businessId,
            isActive: true,
            isAvailable: true
        };
        if (contentMode === "category" && selectedCategoryId) {
            productWhere.categoryId = selectedCategoryId;
        }
        const starDate = new Date();
        starDate.setHours(0, 0, 0, 0);
        const mediaItems = isMediaMode
            ? await prisma.media.findMany({
                where: mediaWhere,
                orderBy: { createdAt: "desc" }
            })
            : [];
        const todaysStars = !isMediaMode
            ? await prisma.todaysStar.findMany({
                where: { businessId: device.businessId, starDate },
                include: { product: { include: { category: true } } },
                orderBy: { createdAt: "asc" }
            })
            : [];
        const todaysStarIds = new Set(todaysStars.map((star) => star.productId));
        let menuItems: any[] = [];
        try {
            menuItems = isMediaMode
                ? []
                : isComboMode
                    ? await prisma.comboOffer.findMany({
                        where: { businessId: device.businessId, isActive: true },
                        include: {
                            items: {
                                include: { product: { include: { category: true } } },
                                orderBy: { id: "asc" }
                            }
                        },
                        orderBy: { id: "desc" }
                    })
                : isTodaysStarMode
                    ? todaysStars.map((star) => star.product)
                    : await prisma.product.findMany({
                        where: productWhere,
                        include: { category: true },
                        orderBy: [{ category: { position: "asc" } }, { position: "asc" }]
                    });
        } catch (error) {
            console.error("DISPLAY_CONTENT_FETCH_FAILED", error);
            menuItems = [];
        }

        return {
            deviceCode: device.deviceCode,
            isPaired: true,
            businessName: device.business.name,
            businessLogoUrl: (device.business as any).logoUrl ?? null,
            orientation: (device as any).orientation ?? "normal",
            menuTheme: (device as any).menuTheme ?? "light",
            themeColor: (device as any).themeColor ?? "gold",
            displayConfig: {
                mode: isMediaMode ? "media" : "menuBoard",
                contentMode,
                selectedCategoryId,
                selectedMediaId,
                menuCategory: "all",
                themeOverride: (device as any).menuTheme ?? "light",
                themeColor: (device as any).themeColor ?? "gold",
                transitionStyle,
                transitionSpeedSeconds,
                autoScrollIntervalSeconds: interval,
                showPrice: (device.business as any).showPrice ?? true,
                showDescription: (device.business as any).showDescription ?? true,
                showLogo: (device.business as any).showLogo ?? true,
                showCompanyName: (device.business as any).showCompanyName ?? true,
                showProductImage: (device.business as any).showProductImage ?? true,
                mediaItems: mediaItems.map(serializeMedia),
                menuItems: isComboMode
                    ? menuItems.map(serializeComboOffer)
                    : menuItems.map((product) =>
                        serializeProduct({
                            ...product,
                            isTodaysStar: todaysStarIds.has(product.id)
                        })
                    )
            }
        };

    } catch (error: any) {
        throw new Error(`ERROR_FETCHING_DEVICE_CONFIG: ${error.message}`);
    }
};

/* ================================
   UPDATE DISPLAY CONFIG
================================ */
const updateDeviceConfigService = async ({
    deviceId,
    businessId,
    userId,
    name,
    orientation,
    menuTheme,
    themeColor,
    displayContentMode,
    selectedCategoryId,
    selectedMediaId,
    transitionStyle,
    transitionSpeedSeconds,
    autoScrollIntervalSeconds
}: DeviceConfigInput) => {
    try {
        if (!deviceId) {
            throw new Error("DEVICE_ID_REQUIRED");
        }

        const existingDevice = await prisma.device.findFirst({
            where: {
                id: deviceId,
                businessId,
                isActive: true
            }
        });

        if (!existingDevice) {
            throw new Error("DEVICE_NOT_FOUND");
        }

        const updateData: Record<string, string | number | null> = {};
        const normalizedName = normalizeDeviceName(name);

        if (name !== undefined) {
            if (!normalizedName) {
                throw new Error("DEVICE_NAME_REQUIRED");
            }

            const duplicateName = await findDuplicateDeviceName(
                businessId,
                normalizedName,
                deviceId
            );

            if (duplicateName) {
                throw new Error("DEVICE_NAME_ALREADY_EXISTS");
            }

            updateData.name = normalizedName;
        }

        if (orientation !== undefined) {
            if (!allowedOrientations.has(orientation)) {
                throw new Error("INVALID_ORIENTATION");
            }
            updateData.orientation = orientation;
        }

        const normalizedMenuTheme = normalizeDisplaySetting(menuTheme);
        const normalizedThemeColor = normalizeDisplaySetting(themeColor);
        const normalizedTransitionStyle = normalizeDisplaySetting(transitionStyle);

        if (normalizedMenuTheme !== undefined) {
            if (!allowedMenuThemes.has(normalizedMenuTheme)) {
                throw new Error("INVALID_MENU_THEME");
            }
            updateData.menuTheme = normalizedMenuTheme;
        }

        if (normalizedThemeColor !== undefined) {
            if (!allowedThemeColors.has(normalizedThemeColor)) {
                throw new Error("INVALID_THEME_COLOR");
            }
            updateData.themeColor = normalizedThemeColor;
        }

        if (displayContentMode !== undefined) {
            if (!allowedContentModes.has(displayContentMode)) {
                throw new Error("INVALID_DISPLAY_CONTENT_MODE");
            }
            updateData.displayContentMode = displayContentMode;
        }

        if (selectedCategoryId !== undefined) {
            if (
                selectedCategoryId !== null &&
                (!Number.isInteger(selectedCategoryId) || selectedCategoryId < 1)
            ) {
                throw new Error("INVALID_SELECTED_CATEGORY");
            }
            updateData.selectedCategoryId = selectedCategoryId;
        }

        if (selectedMediaId !== undefined) {
            if (
                selectedMediaId !== null &&
                (!Number.isInteger(selectedMediaId) || selectedMediaId < 1)
            ) {
                throw new Error("INVALID_SELECTED_MEDIA");
            }
            updateData.selectedMediaId = selectedMediaId;
        }

        if (normalizedTransitionStyle !== undefined) {
            if (!allowedTransitionStyles.has(normalizedTransitionStyle)) {
                throw new Error("INVALID_TRANSITION_STYLE");
            }
            updateData.transitionStyle = normalizedTransitionStyle;
        }

        if (transitionSpeedSeconds !== undefined) {
            if (
                typeof transitionSpeedSeconds !== "number" ||
                transitionSpeedSeconds < 0.1 ||
                transitionSpeedSeconds > 2
            ) {
                throw new Error("INVALID_TRANSITION_SPEED");
            }
            updateData.transitionSpeedSeconds = transitionSpeedSeconds;
        }

        if (autoScrollIntervalSeconds !== undefined) {
            if (
                !Number.isInteger(autoScrollIntervalSeconds) ||
                autoScrollIntervalSeconds < 3 ||
                autoScrollIntervalSeconds > 60
            ) {
                throw new Error("INVALID_AUTO_SCROLL_INTERVAL");
            }
            updateData.autoScrollIntervalSeconds = autoScrollIntervalSeconds;
        }

        const updatedDevice = await (prisma.device as any).update({
            where: { id: deviceId },
            data: updateData
        });

        logActivity(
            userId,
            businessId,
            "UPDATED_DEVICE_CONFIG",
            `Updated display settings for ${updatedDevice.name || updatedDevice.deviceCode}`
        );

        sendRealtimeUpdate(
            businessId,
            "DEVICE_CONFIG_UPDATED",
            updatedDevice.deviceCode
        );

        return {
            id: updatedDevice.id,
            name: updatedDevice.name,
            deviceCode: updatedDevice.deviceCode,
            mode: updatedDevice.displayMode,
            orientation: updatedDevice.orientation ?? "normal",
            menuTheme: updatedDevice.menuTheme ?? "light",
            themeColor: updatedDevice.themeColor ?? "gold",
            displayContentMode: updatedDevice.displayContentMode ?? "allCategories",
            selectedCategoryId: updatedDevice.selectedCategoryId ?? null,
            selectedMediaId: updatedDevice.selectedMediaId ?? null,
            transitionStyle: updatedDevice.transitionStyle ?? "fade",
            transitionSpeedSeconds: updatedDevice.transitionSpeedSeconds ?? 0.5,
            autoScrollIntervalSeconds:
                updatedDevice.autoScrollIntervalSeconds ?? 8,
            online: true,
            createdAt: updatedDevice.createdAt
        };

    } catch (error: any) {
        throw new Error(`ERROR_UPDATING_DEVICE_CONFIG: ${error.message}`);
    }
};


/* ================================
   DELETE DEVICE
================================ */
const deleteDeviceService = async (
    deviceId: number,
    businessId: number,
    userId: number
) => {

    try {

        if (!deviceId) {
            throw new Error("DEVICE_ID_REQUIRED");
        }

        // 1. Check device exists
        const existingDevice = await prisma.device.findFirst({
            where: {
                id: deviceId,
                businessId
            }
        });

        if (!existingDevice) {
            throw new Error("DEVICE_NOT_FOUND");
        }

        // 2. Delete device
        await prisma.device.delete({
            where: { id: deviceId }
        });

        logActivity(
            userId,
            businessId,
            "DELETED_DEVICE",
            `Deleted device ${existingDevice.name || "Unnamed"}`
        );

        sendRealtimeUpdate(
            businessId,
            "DEVICE_DELETED",
            {id: deviceId}
        );

        return { success: true };

    } catch (error: any) {
        throw new Error(`ERROR_DELETING_DEVICE: ${error.message}`);
    }
};


export {
    registerDeviceService,
    pairDeviceByCodeService,
    listDevicesByBusinessService,
    getDeviceConfigByCodeService,
    updateDeviceConfigService,
    deleteDeviceService
};
