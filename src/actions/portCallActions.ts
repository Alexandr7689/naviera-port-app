"use server";
import { prisma } from "../lib/prisma";

export async function savePortCallRecord(data: any) {
  try {
    const record = await prisma.portCallRecord.create({
      data: {
        vesselName: data.vesselName,
        vesselType: data.vesselType,
        trb: Number(data.trb),
        eslora: Number(data.eslora),
        originPort: data.originPort,
        destinationPort: data.destinationPort,
        arrivalDate: new Date(data.arrivalDate),
        isSimultaneous: Boolean(data.isSimultaneous),
        importedQty: Number(data.importedQty),
        exportedQty: Number(data.exportedQty),
        dischargeRate: Number(data.dischargeRate),
        loadingRate: Number(data.loadingRate),
        operativeHours: Math.round(Number(data.operativeHours)),
        departureDate: new Date(data.departureDate),
        normalHours: Math.round(Number(data.normalHours)),
        specialHours: Math.round(Number(data.specialHours)),
        dockStayCost: Number(data.dockStayCost),
        dispatchCost: Number(data.dispatchCost),
        totalCost: Number(data.totalCost),
      }
    });
    return { success: true, id: record.id };
  } catch (error: any) {
    console.error("Error al guardar en Prisma:", error);
    throw new Error(error.message || "Error al guardar el registro en la base de datos.");
  }
}

export async function getHistoryRecords() {
  try {
    return await prisma.portCallRecord.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Error al obtener el historial:", error);
    return [];
  }
}
