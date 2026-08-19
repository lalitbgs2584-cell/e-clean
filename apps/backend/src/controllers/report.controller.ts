import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "db/client";

export const listReports = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const reports = await prisma.report.findMany({
            where: userId ? { userId } : undefined,
            orderBy: { createdAt: "desc" },
            include: {
                images: true,
                cleanup: true,
                verification: true,
            },
        });

        return res.json({ success: true, count: reports.length, data: reports });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

export const getReportById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const report = await prisma.report.findUnique({
            where: { id: id as string },
            include: {
                images: true,
                cleanup: true,
                verification: true,
            },
        });

        if (!report) {
            return res.status(404).json({ success: false, error: "Report not found" });
        }

        return res.json({ success: true, data: report });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

export const createReport = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // const report = await prisma.report.create({

        // })
    } catch (error: any) {

    }
}


const DUPLICATE_RADIUS_METERS = 50;
const DUPLICATE_WINDOW_DAYS = 14;

interface NearbyReport {
    id: string;
    status: string;
    description: string | null;
    dumpType: string | null;
    wasteCategory: string | null;
    wasteVolume: string | null;
    attention: string;
    latitude: number;
    longitude: number;
    createdAt: Date;
    distanceMeters: number;
    upvoteCount: number;
}

export const checkNearbyReport = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    try {
        const { latitude, longitude } = req.body;

        // ---------------------------------------------
        // Validate location
        // ---------------------------------------------

        if (
            typeof latitude !== "number" ||
            typeof longitude !== "number"
        ) {
            return res.status(400).json({
                success: false,
                error: "latitude and longitude are required",
            });
        }

        if (latitude < -90 || latitude > 90) {
            return res.status(400).json({
                success: false,
                error: "Invalid latitude",
            });
        }

        if (longitude < -180 || longitude > 180) {
            return res.status(400).json({
                success: false,
                error: "Invalid longitude",
            });
        }

        // ---------------------------------------------
        // Find reports within 50 meters
        // (computed on-the-fly from latitude/longitude columns —
        // the "location" column is a plain text address field,
        // not a PostGIS geography column, so it's never used here)
        // ---------------------------------------------

        const reports = await prisma.$queryRaw<NearbyReport[]>`
      SELECT
        id,
        status,
        description,
        "dumpType",
        "wasteCategory",
        "wasteVolume",
        attention,
        latitude,
        longitude,
        "createdAt",
        "upvoteCount",

        ST_Distance(
          ST_SetSRID(
            ST_MakePoint(longitude, latitude),
            4326
          )::geography,
          ST_SetSRID(
            ST_MakePoint(${longitude}, ${latitude}),
            4326
          )::geography
        ) AS "distanceMeters"

      FROM "reports"

      WHERE ST_DWithin(
        ST_SetSRID(
          ST_MakePoint(longitude, latitude),
          4326
        )::geography,
        ST_SetSRID(
          ST_MakePoint(${longitude}, ${latitude}),
          4326
        )::geography,
        ${DUPLICATE_RADIUS_METERS}
      )

      AND status NOT IN (
        'RESOLVED',
        'VERIFIED',
        'CANCELLED'
      )

      AND "createdAt" > NOW() - INTERVAL '14 days'

      ORDER BY "distanceMeters" ASC

      LIMIT 5;
    `;

        // ---------------------------------------------
        // Nothing nearby
        // ---------------------------------------------

        if (reports.length === 0) {
            return res.status(200).json({
                success: true,
                isNearbyReport: false,
                hasNearbyReport: false,
                message: "No active report found nearby.",
                location: {
                    latitude,
                    longitude,
                },
                radiusMeters: DUPLICATE_RADIUS_METERS,
                reports: [],
            });
        }

        // ---------------------------------------------
        // Closest report
        // ---------------------------------------------

        const closestReport = reports[0];

        return res.status(200).json({
            success: true,

            isNearbyReport: true,
            hasNearbyReport: true,

            location: {
                latitude,
                longitude,
            },

            radiusMeters: DUPLICATE_RADIUS_METERS,

            closestReport: {
                id: closestReport?.id,

                distanceMeters: Math.round(
                    closestReport?.distanceMeters || 0
                ),

                status: closestReport?.status,

                description:
                    closestReport?.description,

                dumpType:
                    closestReport?.dumpType,

                wasteCategory:
                    closestReport?.wasteCategory,

                wasteVolume:
                    closestReport?.wasteVolume,

                attention:
                    closestReport?.attention,

                upvoteCount:
                    closestReport?.upvoteCount,

                createdAt:
                    closestReport?.createdAt,
            },

            // Useful if you want to display
            // multiple nearby reports on a map/list.
            reports: reports.map((report) => ({
                id: report?.id,
                distanceMeters: Math.round(
                    report?.distanceMeters
                ),
                status: report?.status,
                description:
                    report?.description,
                dumpType:
                    report?.dumpType,
                wasteCategory:
                    report?.wasteCategory,
                wasteVolume:
                    report?.wasteVolume,
                attention:
                    report?.attention,
                upvoteCount:
                    report?.upvoteCount,
                createdAt:
                    report?.createdAt,
            })),
            message:
                "An active report already exists near this location.",
        });
    } catch (error) {
        console.error(
            "checkNearbyReport error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Failed to check nearby reports",
        });
    }
};