import { addHours, isWeekend, isSameDay } from 'date-fns';

export interface CalculationInput {
  vesselType: string;
  trb: number;
  eslora: number;
  arrivalDate: Date;
  isSimultaneous: boolean;
  importedQty: number; 
  exportedQty: number;
  emptyImportedQty?: number;
  emptyExportedQty?: number;
  dischargeRate: number;
  loadingRate: number;
  originType: 'nacional' | 'internacional';
  destinationType: 'nacional' | 'internacional';
  passengerStayHours?: number; // Para pasajeros
  passengerDockHours?: number; // Para pasajeros
  holidays: Date[];
  rates?: any;
}

export function calculatePortCallCosts(input: CalculationInput) {
  // 1. Tiempos de Operación (Regla de redondeo por tipo)
  let rawDischarge = 0;
  let rawLoad = 0;
  
  if (input.vesselType === 'container') {
    rawDischarge = input.dischargeRate > 0 ? (input.importedQty + (input.emptyImportedQty || 0)) / input.dischargeRate : 0;
    rawLoad = input.loadingRate > 0 ? (input.exportedQty + (input.emptyExportedQty || 0)) / input.loadingRate : 0;
  } else if (input.vesselType !== 'passenger') {
    rawDischarge = input.dischargeRate > 0 ? input.importedQty / input.dischargeRate : 0;
    rawLoad = input.loadingRate > 0 ? input.exportedQty / input.loadingRate : 0;
  }

  let baseHours = 0;
  if (input.vesselType === 'passenger') {
    baseHours = input.passengerStayHours || 72;
  } else if (input.vesselType === 'solid') {
    // Sólido suma decimales y redondea al final
    baseHours = input.isSimultaneous ? Math.max(rawDischarge, rawLoad) : rawDischarge + rawLoad;
  } else {
    // Otros redondean individual
    const roundedDischarge = Math.ceil(rawDischarge);
    const roundedLoad = Math.ceil(rawLoad);
    baseHours = input.isSimultaneous ? Math.max(roundedDischarge, roundedLoad) : roundedDischarge + roundedLoad;
  }

  const totalOperativeHours = input.vesselType === 'passenger' ? baseHours : Math.ceil(baseHours) + 2;
  const departureDate = addHours(input.arrivalDate, totalOperativeHours);

  // 3. Capitanía del Puerto
  const isPassenger = input.vesselType === 'passenger';
  // El recargo x2 por fin de semana/feriado SOLO aplica a tarifas nacionales ($25 fijos)
  // Para tarifas internacionales (0.023 * TRB), la tarifa es fija sin recargo adicional
  const isArrivalSpecial = isWeekend(input.arrivalDate) || input.holidays.some(h => isSameDay(h, input.arrivalDate));
  const isDepartureSpecial = isWeekend(departureDate) || input.holidays.some(h => isSameDay(h, departureDate));

  // Internacional: 0.023 * TRB (SE DUPLICA si es día especial)
  // Nacional: $25.0 base (SE DUPLICA si es día especial)
  const capitaniaRecepcion = input.originType === 'internacional'
    ? 0.023 * input.trb * (isArrivalSpecial ? 2 : 1)
    : 25.0 * (isArrivalSpecial ? 2 : 1);
  const capitaniaDespacho = input.destinationType === 'internacional'
    ? 0.023 * input.trb * (isDepartureSpecial ? 2 : 1)
    : 25.0 * (isDepartureSpecial ? 2 : 1);

  const capitaniaContaminacion = 12.50;
  const capitaniaRadio = 15.00;
  const capitaniaSeguridad = 1.80; // 0.90 entrada + 0.90 salida

  // Redondeo solo en el total final, igual que Excel
  const totalCapitania = Math.round(
    (capitaniaRecepcion + capitaniaDespacho + capitaniaContaminacion + capitaniaRadio + capitaniaSeguridad) * 100
  ) / 100;

  // 3. Otros Costos Fijos y Migración
  const inocar = 0.75 * input.trb;
  const totalMigracion = (input.originType === 'internacional' ? 15 : 0) + (input.destinationType === 'internacional' ? 15 : 0);
  const totalRemolcadores = (0.125 * input.trb * 2) + 172.38;
  const totalPracticaje = (0.015 * input.trb * 2) + 172.38;

  // 4. Servicios de Puerto y Muelle
  const isCarCarrier = input.vesselType === 'carcarrier';
  const amarreDesamarreBase = isCarCarrier ? 100.0 : 114.92;
  const accesoCanalBase = isCarCarrier ? 0.101 : 0.115;
  const muelleRate = isCarCarrier ? 1.010 : 1.15;

  let muelleHours = isPassenger ? (input.passengerDockHours || 24) : totalOperativeHours;
  let dockStayCost = muelleRate * input.eslora * muelleHours;
  
  let cargoCost = 0;
  if (input.vesselType === 'carcarrier') {
    cargoCost = (input.importedQty + input.exportedQty) * 35.0;
  } else if (input.vesselType === 'container') {
    cargoCost = (input.importedQty + input.exportedQty) * 183.872 + ((input.emptyImportedQty || 0) + (input.emptyExportedQty || 0)) * 137.9;
  } else if (input.vesselType === 'solid') {
    cargoCost = (input.importedQty * 9.193) + (input.exportedQty * 9.193);
  } else if (input.vesselType === 'liquid') {
    cargoCost = (input.importedQty * 3.448) + (input.exportedQty * 3.448);
  } else if (input.vesselType === 'passenger') {
    cargoCost = (input.importedQty * 2.298) + (input.exportedQty * 28.73);
  }

  const totalServiciosPuerto = amarreDesamarreBase + (accesoCanalBase * input.trb) + dockStayCost + cargoCost;
  const tasaMunicipal = input.vesselType === 'passenger' ? 180.0 : 0;

  return {
    times: { totalOperativeHours },
    dates: { arrival: input.arrivalDate, departure: departureDate },
    hoursMap: { normalHours: 0, specialHours: 0 },
    costs: {
      inocar, capitania: totalCapitania, migracion: totalMigracion,
      remolcadores: totalRemolcadores, practicaje: totalPracticaje,
      serviciosPuerto: totalServiciosPuerto, dockStayCost, tasaMunicipal, dispatchCost: 0,
      totalGeneral: inocar + totalCapitania + totalMigracion + totalRemolcadores + totalPracticaje + totalServiciosPuerto + tasaMunicipal
    }
  };
}
