// src/services/userActivity.service.ts
import prisma from "../config/prisma";

const ADMIN_REALTIME_URL =
  process.env.ADMIN_REALTIME_URL || "http://realtime:3003/realtime/admin-broadcast";

const notifyAdminDashboard = (eventType: string, data: any) => {
  fetch(ADMIN_REALTIME_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.REALTIME_INTERNAL_SECRET
        ? { "x-internal-realtime-secret": process.env.REALTIME_INTERNAL_SECRET }
        : {}),
    },
    body: JSON.stringify({
      type: "ADMIN_DASHBOARD_UPDATED",
      data: {
        source: "user-activity",
        eventType,
        ...data,
      },
    }),
  }).catch(() => undefined);
};

export const logUserActivity = async ({
  userId,
  businessId,
  action,
  description,
}: {
  userId: number;
  businessId: number;
  action: string;
  description?: string;
}) => {
  const activity = await prisma.userActivity.create({
    data: {
      userId,
      businessId,
      action,
      description,
    },
  });

  notifyAdminDashboard(action, {
    userId,
    businessId,
    description,
  });

  return activity;
};

const normalizeSeverity = (value?: string) => {
  const severity = (value || "medium").toLowerCase();
  if (severity === "critical" || severity === "medium" || severity === "low") {
    return severity;
  }
  return "medium";
};

const errorCodeFromMessage = (message: string) =>
  message
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60)
    .toUpperCase() || "UNHANDLED_ERROR";

export const logAppError = async (input: any) => {
  const message = input.message?.toString() || "Unknown error";
  const errorId =
    input.errorId?.toString() ||
    `ERR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const error = await (prisma as any).appError.create({
    data: {
      errorId,
      source: input.source?.toString() || "unknown",
      errorCode: input.errorCode?.toString() || errorCodeFromMessage(message),
      errorType: input.errorType?.toString() || "backend",
      severity: normalizeSeverity(input.severity),
      status: input.status?.toString() || "open",
      message,
      stackTrace: input.stackTrace?.toString(),
      deviceId: input.deviceId?.toString(),
      deviceName: input.deviceName?.toString(),
      ownerId: input.ownerId?.toString(),
      ownerName: input.ownerName?.toString(),
      businessId: input.businessId ? Number(input.businessId) : undefined,
      businessName: input.businessName?.toString(),
      customerId: input.customerId?.toString(),
      appVersion: input.appVersion?.toString(),
      osVersion: input.osVersion?.toString(),
      environment: input.environment,
      rawDetails: input.rawDetails ?? input,
    },
  });

  notifyAdminDashboard("APP_ERROR_CREATED", {
    errorId: error.errorId,
    severity: error.severity,
    errorType: error.errorType,
    message: error.message,
    businessId: error.businessId,
    businessName: error.businessName,
  });

  return error;
};

export const listUserActivities = async () => {
  const activities = await prisma.userActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return activities.map((activity) => ({
    id: activity.id,
    userId: activity.userId,
    businessId: activity.businessId,
    action: activity.action,
    description: activity.description,
    createdAt: activity.createdAt,
  }));
};

export const listAppErrors = async () => {
  const errors = await (prisma as any).appError.findMany({
    orderBy: { createdAt: "desc" },
  });

  return errors.map((error: any) => ({
    id: error.id,
    errorId: error.errorId,
    source: error.source,
    errorCode: error.errorCode,
    errorType: error.errorType,
    severity: error.severity,
    status: error.status,
    message: error.message,
    stackTrace: error.stackTrace,
    deviceId: error.deviceId,
    deviceName: error.deviceName,
    ownerId: error.ownerId,
    ownerName: error.ownerName,
    businessId: error.businessId,
    businessName: error.businessName,
    customerId: error.customerId,
    appVersion: error.appVersion,
    osVersion: error.osVersion,
    environment: error.environment,
    rawDetails: error.rawDetails,
    resolvedAt: error.resolvedAt,
    resolvedBy: error.resolvedBy,
    createdAt: error.createdAt,
    updatedAt: error.updatedAt,
  }));
};

export const deleteAppErrorByErrorId = async (errorId: string) => {
  return (prisma as any).appError.delete({
    where: { errorId },
  });
};
