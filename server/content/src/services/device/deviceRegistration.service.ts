import prisma from "../../config/prisma";
import type { Device } from "@prisma/client";
import { logActivity } from "../../utils/activityClient";
import {
    getDeviceRealtimeStatus,
    getDeviceRealtimeStatuses,
    sendDeviceRealtimeUpdate,
    sendRealtimeUpdate
} from "../../utils/realtimeClient";

interface DeviceInput {
    deviceId?: number;
    name?: string;
    deviceCode?: string;
    businessId: number;
    userId: number;
    token?: string;
    deviceInfo?: Record<string, any>;
}

interface DeviceConfigInput {
    deviceId: number;
    businessId: number;
    userId: number;
    name?: string;
    orientation?: string;
    menuTheme?: string;
    themeColor?: string;
    displayLanguage?: string;
    displayContentMode?: string;
    selectedCategoryId?: number | null;
    selectedMediaId?: number | null;
    transitionStyle?: string;
    transitionSpeedSeconds?: number;
    autoScrollIntervalSeconds?: number;
    scheduleEnabled?: boolean;
    alwaysOn?: boolean;
    scheduleStartTime?: string;
    scheduleEndTime?: string;
    showPrice?: boolean;
    showDescription?: boolean;
    showLogo?: boolean;
    showCompanyName?: boolean;
    showProductImage?: boolean;
    showDietTags?: boolean;
    showComboItemQuantity?: boolean;
    headingFontScale?: number;
    nameFontScale?: number;
    descriptionFontScale?: number;
    priceFontScale?: number;
    token?: string;
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
    "veg",
    "nonVeg",
    "comboOffers",
    "offers",
    "notices",
    "todaysStar"
]);
const canonicalContentModes: Record<string, string> = {
    allcategories: "allCategories",
    category: "category",
    allmedia: "allMedia",
    media: "media",
    veg: "veg",
    nonveg: "nonVeg",
    non_veg: "nonVeg",
    combooffers: "comboOffers",
    combooffer: "comboOffers",
    offers: "offers",
    offer: "offers",
    notices: "notices",
    notice: "notices",
    todaysstar: "todaysStar",
    todaystar: "todaysStar"
};

const defaultPlanTvLimits: Record<string, number> = {
    trial: 1,
    clay: 1,
    metal: 4,
    steel: 8
};

const getBusinessTvLimit = async (subscriptionPlanId?: string | null) => {
    const planId = subscriptionPlanId?.trim().toLowerCase() || "trial";
    const plan = await prisma.subscriptionPlanConfig.findUnique({
        where: { id: planId },
        select: { maxTvDevices: true }
    });

    return plan?.maxTvDevices ?? defaultPlanTvLimits[planId] ?? 1;
};
const contentModeOrder = [
    "category",
    "veg",
    "nonVeg",
    "allMedia",
    "media",
    "comboOffers",
    "offers",
    "notices",
    "todaysStar"
];
const allContentModes = ["category", "veg", "nonVeg", "allMedia", "comboOffers", "offers", "notices", "todaysStar"];
const allowedTransitionStyles = new Set(["fade", "slide", "zoom", "flip"]);
const allowedDisplayLanguages = new Set(["english", "malayalam"]);
const MIN_FONT_SCALE = 0.8;
const MAX_FONT_SCALE = 1.2;

const todayStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const normalizeDisplaySetting = (value?: string) =>
    typeof value === "string" ? value.trim().toLowerCase() : value;

const normalizeContentModeParts = (value?: string | null) =>
    (value ?? "allCategories")
        .split(",")
        .map((mode) => canonicalContentModes[mode.trim().toLowerCase()] ?? mode.trim())
        .filter(Boolean);

const parseContentModes = (value?: string | null) => {
    const rawModes = normalizeContentModeParts(value);
    if (!rawModes.length || rawModes.includes("allCategories")) {
        return allContentModes;
    }
    const uniqueModes = Array.from(new Set(rawModes));
    const orderedModes = contentModeOrder.filter((mode) => uniqueModes.includes(mode));
    return orderedModes.length ? orderedModes : allContentModes;
};

const normalizeContentModeValue = (value: string) => {
    const rawModes = normalizeContentModeParts(value);
    if (!rawModes.length) return null;
    if (rawModes.some((mode) => !allowedContentModes.has(mode))) return null;
    if (rawModes.includes("allCategories")) {
        return rawModes.length === 1 ? allContentModes.join(",") : null;
    }
    const orderedModes = parseContentModes(rawModes.join(","));
    return orderedModes.length ? orderedModes.join(",") : null;
};

const normalizeDeviceName = (value?: string | null) =>
    typeof value === "string" ? value.trim() : "";

const optionalString = (value: any) =>
    typeof value === "string" && value.trim().length ? value.trim() : undefined;

const optionalInt = (value: any) => {
    const numberValue = Number(value);
    return Number.isInteger(numberValue) ? numberValue : undefined;
};

const optionalFloat = (value: any) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
};

const deviceMetadataUpdate = (deviceInfo?: Record<string, any>) => {
    if (!deviceInfo || typeof deviceInfo !== "object" || Array.isArray(deviceInfo)) {
        return {};
    }

    return {
        ...(optionalString(deviceInfo.manufacturer) && { manufacturer: optionalString(deviceInfo.manufacturer) }),
        ...(optionalString(deviceInfo.brand) && { brand: optionalString(deviceInfo.brand) }),
        ...(optionalString(deviceInfo.model) && { model: optionalString(deviceInfo.model) }),
        ...(optionalString(deviceInfo.product) && { product: optionalString(deviceInfo.product) }),
        ...(optionalString(deviceInfo.deviceName) && { deviceName: optionalString(deviceInfo.deviceName) }),
        ...(optionalString(deviceInfo.board) && { board: optionalString(deviceInfo.board) }),
        ...(optionalString(deviceInfo.hardware) && { hardware: optionalString(deviceInfo.hardware) }),
        ...(optionalString(deviceInfo.androidVersion) && { androidVersion: optionalString(deviceInfo.androidVersion) }),
        ...(optionalInt(deviceInfo.sdkInt) !== undefined && { sdkInt: optionalInt(deviceInfo.sdkInt) }),
        ...(optionalString(deviceInfo.buildId) && { buildId: optionalString(deviceInfo.buildId) }),
        ...(optionalString(deviceInfo.buildDisplay) && { buildDisplay: optionalString(deviceInfo.buildDisplay) }),
        ...(optionalString(deviceInfo.fingerprint) && { fingerprint: optionalString(deviceInfo.fingerprint) }),
        ...(optionalString(deviceInfo.serialNumber) && { serialNumber: optionalString(deviceInfo.serialNumber) }),
        ...(optionalString(deviceInfo.androidId) && { androidId: optionalString(deviceInfo.androidId) }),
        ...(optionalString(deviceInfo.macAddress) && { macAddress: optionalString(deviceInfo.macAddress) }),
        ...(optionalString(deviceInfo.ipAddress) && { ipAddress: optionalString(deviceInfo.ipAddress) }),
        ...(optionalInt(deviceInfo.screenWidth) !== undefined && { screenWidth: optionalInt(deviceInfo.screenWidth) }),
        ...(optionalInt(deviceInfo.screenHeight) !== undefined && { screenHeight: optionalInt(deviceInfo.screenHeight) }),
        ...(optionalFloat(deviceInfo.screenPixelRatio) !== undefined && { screenPixelRatio: optionalFloat(deviceInfo.screenPixelRatio) }),
        ...(optionalString(deviceInfo.platform) && { platform: optionalString(deviceInfo.platform) }),
        ...(optionalString(deviceInfo.osVersion) && { osVersion: optionalString(deviceInfo.osVersion) }),
        ...(optionalString(deviceInfo.appVersion) && { appVersion: optionalString(deviceInfo.appVersion) }),
        rawDeviceInfo: deviceInfo
    };
};

const deviceMetadataResponse = (device: any) => ({
    manufacturer: device.manufacturer,
    brand: device.brand,
    model: device.model,
    product: device.product,
    deviceName: device.deviceName,
    board: device.board,
    hardware: device.hardware,
    androidVersion: device.androidVersion,
    sdkInt: device.sdkInt,
    buildId: device.buildId,
    buildDisplay: device.buildDisplay,
    fingerprint: device.fingerprint,
    serialNumber: device.serialNumber,
    androidId: device.androidId,
    macAddress: device.macAddress,
    ipAddress: device.ipAddress,
    screenWidth: device.screenWidth,
    screenHeight: device.screenHeight,
    screenPixelRatio: device.screenPixelRatio,
    platform: device.platform,
    osVersion: device.osVersion,
    appVersion: device.appVersion,
    rawDeviceInfo: device.rawDeviceInfo
});

const resolveDeviceBool = (
    device: any,
    business: any,
    key: string,
    fallback = true
) => device[key] ?? business?.[key] ?? fallback;

const validateFontScale = (value: number | undefined, field: string) => {
    if (value === undefined) return undefined;
    if (typeof value !== "number" || value < MIN_FONT_SCALE || value > MAX_FONT_SCALE) {
        throw new Error(`INVALID_${field.toUpperCase()}`);
    }
    return value;
};

const deviceDisplaySettings = (device: any, business?: any) => ({
    showPrice: resolveDeviceBool(device, business, "showPrice"),
    showDescription: resolveDeviceBool(device, business, "showDescription"),
    showLogo: resolveDeviceBool(device, business, "showLogo"),
    showCompanyName: resolveDeviceBool(device, business, "showCompanyName"),
    showProductImage: resolveDeviceBool(device, business, "showProductImage"),
    showDietTags: resolveDeviceBool(device, business, "showDietTags"),
    showComboItemQuantity: resolveDeviceBool(device, business, "showComboItemQuantity"),
    displayLanguage: device.displayLanguage ?? "english",
    headingFontScale: device.headingFontScale ?? 1,
    nameFontScale: device.nameFontScale ?? 1,
    descriptionFontScale: device.descriptionFontScale ?? 1,
    priceFontScale: device.priceFontScale ?? 1
});

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

const deviceScheduleSettings = (device: any) => ({
    scheduleEnabled: device.scheduleEnabled ?? false,
    alwaysOn: device.alwaysOn ?? true,
    scheduleStartTime: device.scheduleStartTime ?? "09:00",
    scheduleEndTime: device.scheduleEndTime ?? "22:00",
});

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

const serializeProduct = (product: any, includeDietTags = true) => {
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
        tags: includeDietTags ? [product.vegFlag === "non_veg" ? "nonVeg" : "veg"] : []
    };
};

const comboItemUnitPrice = (item: any) => {
    const variantPrice = item.variantPrice === null || item.variantPrice === undefined ? null : Number(item.variantPrice);
    if (variantPrice !== null && variantPrice > 0) return variantPrice;

    const variants = Array.isArray(item.product?.priceVariants) ? item.product.priceVariants : [];
    const selectedLabel = item.variantLabel?.trim().toLowerCase();
    if (selectedLabel) {
        const selectedVariant = variants.find(
            (variant: any) => variant?.label?.trim().toLowerCase() === selectedLabel
        );
        if (selectedVariant?.price !== undefined && selectedVariant?.price !== null) {
            return Number(selectedVariant.price);
        }
    }

    const productPrice = Number(item.product?.price ?? 0);
    if (productPrice > 0) return productPrice;

    const fullVariant = variants.find(
        (variant: any) => variant?.label?.trim().toLowerCase() === "full"
    );
    if (fullVariant?.price !== undefined && fullVariant?.price !== null) {
        return Number(fullVariant.price);
    }

    const fallbackVariant = variants[variants.length - 1];
    if (fallbackVariant?.price !== undefined && fallbackVariant?.price !== null) {
        return Number(fallbackVariant.price);
    }

    return productPrice;
};

const serializeMedia = (media: any) => ({
    id: media.id,
    fileName: media.fileName,
    url: mediaUrl(media.url),
    type: mediaType(media.type)
});

const serializeComboOffer = (combo: any, includeDietTags = true) => {
    const comboItems = (combo.items ?? []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity ?? 1,
        variantLabel: item.variantLabel ?? null,
        variantPrice: item.variantPrice === null || item.variantPrice === undefined ? null : Number(item.variantPrice),
        product: item.product ? serializeProduct(item.product, includeDietTags) : null
    })).filter((item: any) => item.product !== null);
    const originalPrice = (combo.items ?? []).reduce(
        (total: number, item: any) =>
            total + comboItemUnitPrice(item) * Number(item.quantity ?? 1),
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
        tags: [],
        originalPrice,
        comboItems,
        items: comboItems
    };
};

const serializeOffer = (offer: any, includeDietTags = true) => {
    const offerItems = (offer.items ?? []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity ?? 1,
        variantLabel: item.variantLabel ?? null,
        variantPrice: item.variantPrice === null || item.variantPrice === undefined ? null : Number(item.variantPrice),
        discountPrice: item.discountPrice === null || item.discountPrice === undefined ? null : Number(item.discountPrice),
        buyQuantity: item.buyQuantity ?? item.quantity ?? offer.buyQuantity ?? 1,
        freeQuantity: item.freeQuantity ?? offer.freeQuantity ?? 1,
        freeProductId: item.freeProductId ?? offer.freeProductId ?? null,
        freeVariantLabel: item.freeVariantLabel ?? null,
        freeVariantPrice: item.freeVariantPrice === null || item.freeVariantPrice === undefined ? null : Number(item.freeVariantPrice),
        freeProduct: item.freeProduct
            ? serializeProduct(item.freeProduct, includeDietTags)
            : offer.freeProduct
                ? serializeProduct(offer.freeProduct, includeDietTags)
                : null,
        product: item.product ? serializeProduct(item.product, includeDietTags) : null
    })).filter((item: any) => item.product !== null);
    const originalPrice = (offer.items ?? []).reduce(
        (total: number, item: any) =>
            total + comboItemUnitPrice(item) * Number(item.quantity ?? 1),
        0
    );
    const discountPrice = offer.discountPrice === null || offer.discountPrice === undefined
        ? null
        : Number(offer.discountPrice);
    const freeProduct = offer.freeProduct
        ? serializeProduct(offer.freeProduct, includeDietTags)
        : null;
    const itemDiscounts = offerItems
        .map((item: any) => item.discountPrice)
        .filter((price: any) => typeof price === "number" && Number.isFinite(price));
    const lowestDiscountPrice = itemDiscounts.length ? Math.min(...itemDiscounts) : discountPrice;
    const firstFreeItem = offerItems.find((item: any) => item.freeProduct);
    const description = offer.offerType === "free" && (firstFreeItem || freeProduct)
        ? `Buy ${firstFreeItem?.buyQuantity ?? offer.buyQuantity ?? 1}, get ${firstFreeItem?.freeQuantity ?? offer.freeQuantity ?? 1} ${(firstFreeItem?.freeProduct ?? freeProduct).name} free`
        : itemDiscounts.length > 1
            ? `Offer prices from Rs. ${(lowestDiscountPrice ?? 0).toFixed(0)}`
            : `Offer price Rs. ${(lowestDiscountPrice ?? 0).toFixed(0)}`;

    return {
        id: `offer-${offer.id}`,
        name: offer.name,
        description,
        price: lowestDiscountPrice ?? originalPrice,
        priceVariants: [],
        imageUrl: null,
        category: "all",
        categoryId: null,
        categoryName: "Offers",
        isAvailable: true,
        isFeatured: true,
        tags: [offer.offerType === "free" ? "Free offer" : "Discount"],
        originalPrice,
        offerType: offer.offerType,
        buyQuantity: offer.buyQuantity,
        freeQuantity: offer.freeQuantity,
        freeProduct,
        offerItems,
        items: offerItems
    };
};

const serializeNotice = (notice: any) => ({
    id: notice.id,
    content: notice.content,
    createdAt: notice.createdAt
});

/* ================================
   REGISTER DEVICE
================================ */
const registerDeviceService = async ({
    name,
    businessId,
    userId,
    token,
    deviceInfo
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
                deviceCode,
                ...deviceMetadataUpdate(deviceInfo)
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
            device.deviceCode,
            token
        );

        return {
            id: device.id,
            name: device.name,
            deviceCode: device.deviceCode,
            ...deviceMetadataResponse(device)
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
    userId,
    token,
    deviceInfo
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

        if (!existingDevice) {
            const [deviceCount, tvLimit] = await Promise.all([
                prisma.device.count({ where: { businessId } }),
                getBusinessTvLimit(business.subscriptionPlanId)
            ]);

            if (deviceCount >= tvLimit) {
                throw new Error(`DEVICE_LIMIT_REACHED:${tvLimit}`);
            }
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
                    name: normalizedName || existingDevice.name || `Display ${normalizedCode.slice(0, 4)}`,
                    ...deviceMetadataUpdate(deviceInfo)
                }
            })
            : await prisma.device.create({
                data: {
                    name: normalizedName || `Display ${normalizedCode.slice(0, 4)}`,
                    businessId,
                    deviceCode: normalizedCode,
                    ...deviceMetadataUpdate(deviceInfo)
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
            device.deviceCode,
            token
        );

        void getDeviceConfigByCodeService(device.deviceCode)
            .then((displayConfig) => sendDeviceRealtimeUpdate(
                device.deviceCode,
                "DEVICE_CONFIG_UPDATED",
                displayConfig
            ))
            .catch((error) => console.error("Device config push failed:", error));

        const online = await getDeviceRealtimeStatus(device.deviceCode, token);

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
            ...deviceScheduleSettings(device),
            ...deviceDisplaySettings(device),
            online,
            createdAt: device.createdAt,
            ...deviceMetadataResponse(device)
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

        const statuses = await getDeviceRealtimeStatuses(
            devices.map((device) => device.deviceCode)
        );

        return devices.map((device) => {
            const normalizedDeviceCode = device.deviceCode.trim().toUpperCase();

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
                ...deviceScheduleSettings(device),
                ...deviceDisplaySettings(device),
                online: Boolean(statuses[normalizedDeviceCode]),
                createdAt: device.createdAt,
                ...deviceMetadataResponse(device)
            };
        });

    } catch (error: any) {
        throw new Error(`ERROR_FETCHING_DEVICES: ${error.message}`);
    }
};

/* ================================
   UPDATE DEVICE METADATA BY CODE
================================ */
const updateDeviceMetadataByCodeService = async (
    deviceCode: string,
    deviceInfo?: Record<string, any>
) => {
    const normalizedCode = deviceCode.trim().toUpperCase();
    const metadata = deviceMetadataUpdate(deviceInfo);

    if (!normalizedCode) {
        throw new Error("DEVICE_CODE_REQUIRED");
    }

    if (!Object.keys(metadata).length) {
        throw new Error("DEVICE_INFO_REQUIRED");
    }

    const existingDevice = await prisma.device.findUnique({
        where: { deviceCode: normalizedCode }
    });

    if (!existingDevice) {
        throw new Error("DEVICE_NOT_FOUND");
    }

    const device = await prisma.device.update({
        where: { id: existingDevice.id },
        data: metadata
    });

    return {
        id: device.id,
        name: device.name,
        deviceCode: device.deviceCode,
        ...deviceMetadataResponse(device)
    };
};

/* ================================
   ADMIN BUSINESS + DISPLAY DEVICES
================================ */
const getAdminBusinessDeviceOverviewService = async (businessId: number) => {
    let business;
    try {
        business = await (prisma as any).business.findUnique({
            where: { id: businessId },
            include: {
                devices: {
                    where: { isActive: true },
                    orderBy: { createdAt: "desc" }
                },
                adminOffers: {
                    orderBy: { createdAt: "desc" }
                },
                planTransactions: {
                    orderBy: { createdAt: "desc" }
                }
            }
        });
    } catch (error: any) {
        const message = String(error?.message ?? error);
        if (!message.includes("BusinessAdminOffer") ||
            !message.toLowerCase().includes("does not exist")) {
            throw error;
        }
        business = await prisma.business.findUnique({
            where: { id: businessId },
            include: {
                devices: {
                    where: { isActive: true },
                    orderBy: { createdAt: "desc" }
                },
                planTransactions: {
                    orderBy: { createdAt: "desc" }
                }
            }
        });
    }

    if (!business) {
        throw new Error("BUSINESS_NOT_FOUND");
    }

    const statuses = await getDeviceRealtimeStatuses(
        business.devices.map((device: Device) => device.deviceCode)
    );

    const devices = business.devices.map((device: Device) => {
        const normalizedDeviceCode = device.deviceCode.trim().toUpperCase();

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
            autoScrollIntervalSeconds: (device as any).autoScrollIntervalSeconds ?? 8,
            ...deviceScheduleSettings(device),
            ...deviceDisplaySettings(device, business),
            online: Boolean(statuses[normalizedDeviceCode]),
            createdAt: device.createdAt,
            ...deviceMetadataResponse(device)
        };
    });
    const now = new Date();
    const offers: any[] = (((business as any).adminOffers as any[]) ?? []).map((offer) => ({
        id: offer.id,
        type: offer.type,
        planId: offer.planId,
        planName: offer.planName,
        originalAmount: offer.originalAmount == null ? null : Number(offer.originalAmount),
        amount: offer.offerAmount == null ? null : Number(offer.offerAmount),
        offerAmount: offer.offerAmount == null ? null : Number(offer.offerAmount),
        currency: offer.currency ?? "INR",
        extensionDays: offer.extensionDays,
        previousEndsAt: offer.previousEndsAt,
        newEndsAt: offer.newEndsAt,
        validUntil: offer.validUntil,
        expiresAt: offer.validUntil,
        createdAt: offer.createdAt
    }));
    const extensionFallback = (business as any).subscriptionExtensionDays &&
        (business as any).subscriptionExtensionNewEndsAt
        ? {
            type: "PLAN_EXTENSION",
            extensionDays: (business as any).subscriptionExtensionDays,
            previousEndsAt: (business as any).subscriptionExtensionPreviousEndsAt,
            newEndsAt: (business as any).subscriptionExtensionNewEndsAt,
            currency: "INR",
            createdAt: (business as any).subscriptionExtensionCreatedAt,
        }
        : null;
    if (extensionFallback &&
        !offers.some((offer) =>
            offer.type === extensionFallback.type &&
            offer.extensionDays === extensionFallback.extensionDays &&
            String(offer.newEndsAt ?? "") === String(extensionFallback.newEndsAt ?? "")
        )) {
        offers.unshift(extensionFallback);
    }
    const activeOffer = offers.find((offer) =>
        offer.type === "PLAN_OFFER" &&
        (!offer.validUntil || new Date(offer.validUntil).getTime() >= now.getTime())
    );
    const fallbackOffer = (business as any).subscriptionOfferPlanId &&
        (!(business as any).subscriptionOfferExpiresAt ||
            new Date((business as any).subscriptionOfferExpiresAt).getTime() >= now.getTime())
        ? {
            type: "PLAN_OFFER",
            planId: (business as any).subscriptionOfferPlanId,
            planName: (business as any).subscriptionOfferPlanName,
            originalAmount:
                (business as any).subscriptionOfferOriginalAmount == null
                    ? null
                    : Number((business as any).subscriptionOfferOriginalAmount),
            amount:
                (business as any).subscriptionOfferAmount == null
                    ? null
                    : Number((business as any).subscriptionOfferAmount),
            offerAmount:
                (business as any).subscriptionOfferAmount == null
                    ? null
                    : Number((business as any).subscriptionOfferAmount),
            currency: (business as any).subscriptionOfferCurrency ?? "INR",
            expiresAt: (business as any).subscriptionOfferExpiresAt,
            validUntil: (business as any).subscriptionOfferExpiresAt,
            createdAt: (business as any).subscriptionOfferCreatedAt,
        }
        : null;

    const hasSubscriptionData = Boolean((business as any).subscriptionPlanId) ||
        Boolean(activeOffer ?? fallbackOffer) ||
        offers.length > 0;

    return {
        business: {
            id: business.id,
            name: business.name,
            mobile: business.mobile,
            email: business.email,
            address: business.address,
            isActive: business.isActive,
            subscriptionPlanId: (business as any).subscriptionPlanId,
            subscriptionPlanName: (business as any).subscriptionPlanName,
            subscriptionStatus: (business as any).subscriptionStatus,
            subscriptionAmount: Number((business as any).subscriptionAmount ?? 0),
            subscriptionCurrency: (business as any).subscriptionCurrency ?? "INR",
            subscriptionStartedAt: (business as any).subscriptionStartedAt,
            subscriptionTrialEndsAt: (business as any).subscriptionTrialEndsAt,
            subscriptionEndsAt: (business as any).subscriptionEndsAt,
            subscriptionOfferPlanId: (business as any).subscriptionOfferPlanId,
            subscriptionOfferPlanName: (business as any).subscriptionOfferPlanName,
            subscriptionOfferOriginalAmount:
                (business as any).subscriptionOfferOriginalAmount == null
                    ? null
                    : Number((business as any).subscriptionOfferOriginalAmount),
            subscriptionOfferAmount:
                (business as any).subscriptionOfferAmount == null
                    ? null
                    : Number((business as any).subscriptionOfferAmount),
            subscriptionOfferCurrency: (business as any).subscriptionOfferCurrency ?? "INR",
            subscriptionOfferExpiresAt: (business as any).subscriptionOfferExpiresAt,
            subscriptionOfferCreatedAt: (business as any).subscriptionOfferCreatedAt,
            subscriptionExtensionDays: (business as any).subscriptionExtensionDays,
            subscriptionExtensionPreviousEndsAt: (business as any).subscriptionExtensionPreviousEndsAt,
            subscriptionExtensionNewEndsAt: (business as any).subscriptionExtensionNewEndsAt,
            subscriptionExtensionCreatedAt: (business as any).subscriptionExtensionCreatedAt,
            subscriptionPlan: hasSubscriptionData
                ? {
                    id: (business as any).subscriptionPlanId,
                    name: (business as any).subscriptionPlanName,
                    status: (business as any).subscriptionStatus,
                    amount: Number((business as any).subscriptionAmount ?? 0),
                    currency: (business as any).subscriptionCurrency ?? "INR",
                    startedAt: (business as any).subscriptionStartedAt,
                    trialEndsAt: (business as any).subscriptionTrialEndsAt,
                    endsAt: (business as any).subscriptionEndsAt,
                    offer: activeOffer ?? fallbackOffer,
                    offers,
                }
                : null,
            createdAt: business.createdAt,
            updatedAt: business.updatedAt
        },
        devices,
        transactions: (((business as any).planTransactions as any[]) ?? []).map(
            (transaction) => ({
                id: transaction.id,
                transactionId: transaction.transactionId,
                invoiceId: transaction.invoiceId,
                amount: Number(transaction.amount ?? 0),
                currency: transaction.currency ?? "INR",
                status: transaction.status ?? "success",
                method: transaction.method ?? "plan",
                planId: transaction.planId,
                planName: transaction.planName,
                description: transaction.description,
                customerId: transaction.customerId,
                customerName: transaction.customerName,
                businessId: transaction.businessId,
                businessName: business.name,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
            })
        )
    };
};

/* ================================
   ADMIN ALL DISPLAY DEVICES
================================ */
const getAdminDeviceOverviewService = async () => {
    const devices = await prisma.device.findMany({
        where: { isActive: true },
        include: { business: true },
        orderBy: { createdAt: "desc" }
    });

    const statuses = await getDeviceRealtimeStatuses(
        devices.map((device) => device.deviceCode)
    );

    return {
        devices: devices.map((device) => {
            const normalizedDeviceCode = device.deviceCode.trim().toUpperCase();
            const business = device.business;

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
                autoScrollIntervalSeconds: (device as any).autoScrollIntervalSeconds ?? 8,
                ...deviceScheduleSettings(device),
                ...deviceDisplaySettings(device, business),
                online: Boolean(statuses[normalizedDeviceCode]),
                createdAt: device.createdAt,
                business: {
                    id: business.id,
                    name: business.name,
                    mobile: business.mobile,
                    email: business.email,
                    address: business.address,
                    isActive: business.isActive,
                    createdAt: business.createdAt,
                    updatedAt: business.updatedAt
                },
                ...deviceMetadataResponse(device)
            };
        })
    };
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

        const storedContentMode = (device as any).displayContentMode ?? "allCategories";
        const contentModes = parseContentModes(storedContentMode);
        const contentMode = contentModes.join(",");
        const selectedCategoryId = (device as any).selectedCategoryId ?? null;
        const selectedMediaId = (device as any).selectedMediaId ?? null;
        const transitionStyle = (device as any).transitionStyle ?? "fade";
        const transitionSpeedSeconds = (device as any).transitionSpeedSeconds ?? 0.5;
        const interval = (device as any).autoScrollIntervalSeconds ?? 8;
        const displaySettings = deviceDisplaySettings(device, device.business);
        const serverTime = new Date();
        const subscriptionExpiresAt =
            (device.business as any).subscriptionEndsAt ??
            (device.business as any).subscriptionTrialEndsAt ??
            null;
        const subscriptionStatus = String(
            (device.business as any).subscriptionStatus ?? ""
        ).trim().toLowerCase();
        const subscriptionBlocked =
            ["expired", "inactive", "suspended", "cancelled", "canceled"].includes(subscriptionStatus) ||
            (subscriptionExpiresAt instanceof Date &&
                subscriptionExpiresAt.getTime() <= serverTime.getTime());
        const isMediaMode = contentModes.includes("allMedia") || contentModes.includes("media");
        const isOnlyMediaMode = isMediaMode && contentModes.every((mode) => mode === "allMedia" || mode === "media");
        const isComboMode = contentModes.includes("comboOffers");
        const isOffersMode = contentModes.includes("offers");
        const isNoticesMode = contentModes.includes("notices");
        const isTodaysStarMode = contentModes.includes("todaysStar");
        const isVegMode = contentModes.includes("veg");
        const isNonVegMode = contentModes.includes("nonVeg");
        const isCategoryMode = contentModes.includes("allCategories") || contentModes.includes("category");
        const mediaWhere: any = { businessId: device.businessId };
        if (contentModes.includes("media") && selectedMediaId) {
            mediaWhere.id = selectedMediaId;
        }
        const productWhere: any = {
            businessId: device.businessId,
            isActive: true
        };
        if (contentModes.includes("category") && selectedCategoryId) {
            productWhere.categoryId = selectedCategoryId;
        }
        const starDate = new Date();
        starDate.setHours(0, 0, 0, 0);
        const mediaItems = contentModes.includes("media") && selectedMediaId
            ? await prisma.media.findMany({
                where: mediaWhere,
                orderBy: { createdAt: "desc" }
            })
            : [];
        const todaysStars = !isOnlyMediaMode
            ? await prisma.todaysStar.findMany({
                where: { businessId: device.businessId, starDate },
                include: { product: { include: { category: true } } },
                orderBy: { createdAt: "asc" }
            })
            : [];
        const todaysStarIds = new Set(todaysStars.map((star) => star.productId));
        let menuItems: any[] = [];
        let noticeItems: any[] = [];
        try {
            const productItems = !isOnlyMediaMode && isCategoryMode
                ? await prisma.product.findMany({
                    where: productWhere,
                    include: { category: true },
                    orderBy: [{ category: { position: "asc" } }, { position: "asc" }]
                })
                : [];
            const comboItems = !isOnlyMediaMode && isComboMode
                ? await prisma.comboOffer.findMany({
                    where: { businessId: device.businessId, isActive: true },
                    include: {
                        items: {
                            include: {
                                product: { include: { category: true } }
                            },
                            orderBy: { id: "asc" }
                        }
                    },
                    orderBy: { id: "desc" }
                })
                : [];
            const offerItems = !isOnlyMediaMode && isOffersMode
                ? await prisma.offer.findMany({
                    where: {
                        businessId: device.businessId,
                        isActive: true,
                        startDate: { lte: todayStart() },
                        endDate: { gte: todayStart() }
                    },
                    include: {
                        freeProduct: { include: { category: true } },
                        items: {
                            include: {
                                product: { include: { category: true } },
                                freeProduct: { include: { category: true } }
                            },
                            orderBy: { id: "asc" }
                        }
                    },
                    orderBy: { id: "desc" }
                })
                : [];
            const vegItems = !isOnlyMediaMode && isVegMode
                ? await prisma.product.findMany({
                    where: {
                        businessId: device.businessId,
                        isActive: true,
                        vegFlag: "veg"
                    },
                    include: { category: true },
                    orderBy: [{ category: { position: "asc" } }, { position: "asc" }]
                })
                : [];
            const nonVegItems = !isOnlyMediaMode && isNonVegMode
                ? await prisma.product.findMany({
                    where: {
                        businessId: device.businessId,
                        isActive: true,
                        vegFlag: "non_veg"
                    },
                    include: { category: true },
                    orderBy: [{ category: { position: "asc" } }, { position: "asc" }]
                })
                : [];
            const starItems = !isOnlyMediaMode && isTodaysStarMode
                ? todaysStars.map((star) => star.product)
                : [];
            noticeItems = !isOnlyMediaMode && isNoticesMode
                ? await prisma.notice.findMany({
                    where: { businessId: device.businessId, isActive: true },
                    orderBy: { createdAt: "desc" }
                })
                : [];
            const seenMenuItemKeys = new Set<string>();
            menuItems = [...productItems, ...vegItems, ...nonVegItems, ...comboItems, ...offerItems, ...starItems].filter((item) => {
                const key = Array.isArray((item as any).items)
                    ? `${(item as any).offerType ? "offer" : "combo"}-${item.id}`
                    : `product-${item.id}`;
                if (seenMenuItemKeys.has(key)) return false;
                seenMenuItemKeys.add(key);
                return true;
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
            subscriptionExpiresAt,
            subscriptionBlocked,
            serverTime,
            orientation: (device as any).orientation ?? "normal",
            menuTheme: (device as any).menuTheme ?? "light",
            themeColor: (device as any).themeColor ?? "gold",
            displayConfig: {
                mode: isOnlyMediaMode ? "media" : "menuBoard",
                contentMode,
                selectedCategoryId,
                selectedMediaId,
                menuCategory: "all",
                themeOverride: (device as any).menuTheme ?? "light",
                themeColor: (device as any).themeColor ?? "gold",
                transitionStyle,
                transitionSpeedSeconds,
                autoScrollIntervalSeconds: interval,
                ...deviceScheduleSettings(device),
                ...displaySettings,
                mediaItems: mediaItems.map(serializeMedia),
                notices: noticeItems.map(serializeNotice),
                menuItems: menuItems.map((item) =>
                    Array.isArray(item.items)
                        ? (item as any).offerType
                            ? serializeOffer(item, displaySettings.showDietTags)
                            : serializeComboOffer(item, displaySettings.showDietTags)
                        : serializeProduct({
                            ...item,
                            isTodaysStar: todaysStarIds.has(item.id)
                        }, displaySettings.showDietTags)
                )
            }
        };

    } catch (error: any) {
        throw new Error(`ERROR_FETCHING_DEVICE_CONFIG: ${error.message}`);
    }
};

const getDevicePairingStatusByCodeService = async (deviceCode: string) => {
    if (!deviceCode) {
        throw new Error("DEVICE_CODE_REQUIRED");
    }

    const normalizedCode = deviceCode.trim().toUpperCase();
    const device = await prisma.device.findUnique({
        where: { deviceCode: normalizedCode },
        select: { id: true, isActive: true }
    });

    return {
        deviceCode: normalizedCode,
        isPaired: device?.isActive === true
    };
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
    displayLanguage,
    displayContentMode,
    selectedCategoryId,
    selectedMediaId,
    transitionStyle,
    transitionSpeedSeconds,
    autoScrollIntervalSeconds,
    scheduleEnabled,
    alwaysOn,
    scheduleStartTime,
    scheduleEndTime,
    showPrice,
    showDescription,
    showLogo,
    showCompanyName,
    showProductImage,
    showDietTags,
    showComboItemQuantity,
    headingFontScale,
    nameFontScale,
    descriptionFontScale,
    priceFontScale,
    token
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

        const updateData: Record<string, string | number | boolean | null> = {};
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
        const normalizedDisplayLanguage = normalizeDisplaySetting(displayLanguage);
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

        if (normalizedDisplayLanguage !== undefined) {
            if (!allowedDisplayLanguages.has(normalizedDisplayLanguage)) {
                throw new Error("INVALID_DISPLAY_LANGUAGE");
            }
            updateData.displayLanguage = normalizedDisplayLanguage;
        }

        if (displayContentMode !== undefined) {
            const normalizedContentMode = normalizeContentModeValue(displayContentMode);
            if (!normalizedContentMode) {
                throw new Error("INVALID_DISPLAY_CONTENT_MODE");
            }
            updateData.displayContentMode = normalizedContentMode;
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

        if (alwaysOn !== undefined) {
            const alwaysOnEnabled = Boolean(alwaysOn);
            updateData.alwaysOn = alwaysOnEnabled;
            updateData.scheduleEnabled = !alwaysOnEnabled;
        } else if (scheduleEnabled !== undefined) {
            updateData.scheduleEnabled = Boolean(scheduleEnabled);
        }

        const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (scheduleStartTime !== undefined) {
            if (!timePattern.test(scheduleStartTime)) {
                throw new Error("INVALID_SCHEDULE_START_TIME");
            }
            updateData.scheduleStartTime = scheduleStartTime;
        }
        if (scheduleEndTime !== undefined) {
            if (!timePattern.test(scheduleEndTime)) {
                throw new Error("INVALID_SCHEDULE_END_TIME");
            }
            updateData.scheduleEndTime = scheduleEndTime;
        }

        if (showPrice !== undefined) updateData.showPrice = Boolean(showPrice);
        if (showDescription !== undefined) updateData.showDescription = Boolean(showDescription);
        if (showLogo !== undefined) updateData.showLogo = Boolean(showLogo);
        if (showCompanyName !== undefined) updateData.showCompanyName = Boolean(showCompanyName);
        if (showProductImage !== undefined) updateData.showProductImage = Boolean(showProductImage);
        if (showDietTags !== undefined) updateData.showDietTags = Boolean(showDietTags);
        if (showComboItemQuantity !== undefined) updateData.showComboItemQuantity = Boolean(showComboItemQuantity);

        const validatedHeadingScale = validateFontScale(headingFontScale, "heading_font_scale");
        const validatedNameScale = validateFontScale(nameFontScale, "name_font_scale");
        const validatedDescriptionScale = validateFontScale(descriptionFontScale, "description_font_scale");
        const validatedPriceScale = validateFontScale(priceFontScale, "price_font_scale");

        if (validatedHeadingScale !== undefined) updateData.headingFontScale = validatedHeadingScale;
        if (validatedNameScale !== undefined) updateData.nameFontScale = validatedNameScale;
        if (validatedDescriptionScale !== undefined) updateData.descriptionFontScale = validatedDescriptionScale;
        if (validatedPriceScale !== undefined) updateData.priceFontScale = validatedPriceScale;

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
            updatedDevice.deviceCode,
            token
        );

        void getDeviceConfigByCodeService(updatedDevice.deviceCode)
            .then((displayConfig) => sendDeviceRealtimeUpdate(
                updatedDevice.deviceCode,
                "DEVICE_CONFIG_UPDATED",
                displayConfig
            ))
            .catch((error) => console.error("Device config push failed:", error));

        const online = await getDeviceRealtimeStatus(updatedDevice.deviceCode, token);

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
            ...deviceScheduleSettings(updatedDevice),
            ...deviceDisplaySettings(updatedDevice),
            online,
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
    userId: number,
    token?: string
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
            {id: deviceId},
            token
        );

        void sendDeviceRealtimeUpdate(
            existingDevice.deviceCode,
            "DEVICE_DELETED",
            { deviceCode: existingDevice.deviceCode }
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
    updateDeviceMetadataByCodeService,
    getAdminBusinessDeviceOverviewService,
    getAdminDeviceOverviewService,
    getDeviceConfigByCodeService,
    getDevicePairingStatusByCodeService,
    updateDeviceConfigService,
    deleteDeviceService
};
