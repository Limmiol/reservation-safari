import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Users, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';

const getResourceIcon = (type) => {
  const icons = {
    vehicle: Truck,
    driver: Users,
    equipment: Wrench,
  };
  return icons[type] || AlertCircle;
};

export default function SchedulingBoard({ booking, vehicles, drivers, equipment, assignments, onAssign, onUpdate }) {
  // Get assigned resources
  const assignedResources = useMemo(() => {
    const assignment = assignments.find(a => a.booking_id === booking.id);
    if (!assignment) return { vehicles: [], drivers: [], equipment: [] };

    const vehicleIds = assignment.vehicle_id ? [assignment.vehicle_id] : [];
    const driverIds = assignment.driver_id ? [assignment.driver_id] : [];
    const equipmentItems = assignment.equipment_items ? JSON.parse(assignment.equipment_items) : [];

    return {
      vehicles: vehicles.filter(v => vehicleIds.includes(v.id)),
      drivers: drivers.filter(d => driverIds.includes(d.id)),
      equipment: equipment.filter(e => equipmentItems.some(ei => ei.id === e.id)),
    };
  }, [assignments, booking.id, vehicles, drivers, equipment]);

  // Get available resources
  const availableResources = useMemo(() => {
    const isConflict = (start, end, itemStart, itemEnd) => {
      return start <= itemEnd && end >= itemStart;
    };

    const available = {
      vehicles: vehicles.filter(v => {
        const hasConflict = assignments.some(a => {
          if (a.booking_id === booking.id || !a.vehicle_id || a.vehicle_id !== v.id) return false;
          return isConflict(booking.start_date, booking.end_date, a.start_date, a.end_date);
        });
        return !hasConflict && v.is_active && v.maintenance_status === 'operational';
      }),
      drivers: drivers.filter(d => {
        const hasConflict = assignments.some(a => {
          if (a.booking_id === booking.id || !a.driver_id || a.driver_id !== d.id) return false;
          return isConflict(booking.start_date, booking.end_date, a.start_date, a.end_date);
        });
        return !hasConflict && d.employment_status === 'active' && d.availability_status === 'available';
      }),
      equipment: equipment.filter(e => {
        const hasConflict = assignments.some(a => {
          if (a.booking_id === booking.id) return false;
          const equipmentItems = JSON.parse(a.equipment_items || '[]');
          if (!equipmentItems.some(ei => ei.id === e.id)) return false;
          return isConflict(booking.start_date, booking.end_date, a.start_date, a.end_date);
        });
        return !hasConflict && e.quantity_available > 0;
      }),
    };

    return available;
  }, [vehicles, drivers, equipment, assignments, booking.start_date, booking.end_date, booking.id]);

  const handleDragEnd = (result) => {
    const { source, destination, draggableId, type } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (destination.droppableId === 'assigned') {
      const [resourceType, resourceId] = draggableId.split('-');
      onAssign({
        booking_id: booking.id,
        booking_ref: booking.booking_ref,
        start_date: booking.start_date,
        end_date: booking.end_date,
        [resourceType === 'vehicle' ? 'vehicle_id' : resourceType === 'driver' ? 'driver_id' : 'equipment_items']: 
          resourceType === 'equipment' ? JSON.stringify([{ id: resourceId }]) : resourceId,
        status: 'pending',
      });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Resources */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Available Vehicles */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Vehicles ({availableResources.vehicles.length})
                </h4>
                <Droppable droppableId="available-vehicles">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-2 p-2 rounded border-2 border-dashed ${
                        snapshot.isDraggingOver ? 'bg-accent border-primary' : 'border-border'
                      }`}
                    >
                      {availableResources.vehicles.map((vehicle, index) => (
                        <Draggable key={vehicle.id} draggableId={`vehicle-${vehicle.id}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-2 rounded bg-card border cursor-move text-sm ${
                                snapshot.isDragging ? 'shadow-lg bg-primary text-primary-foreground' : ''
                              }`}
                            >
                              <div className="font-medium">{vehicle.name}</div>
                              <div className="text-xs opacity-75">{vehicle.registration_number}</div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {availableResources.vehicles.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No vehicles available</p>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Available Drivers */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Drivers ({availableResources.drivers.length})
                </h4>
                <Droppable droppableId="available-drivers">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-2 p-2 rounded border-2 border-dashed ${
                        snapshot.isDraggingOver ? 'bg-accent border-primary' : 'border-border'
                      }`}
                    >
                      {availableResources.drivers.map((driver, index) => (
                        <Draggable key={driver.id} draggableId={`driver-${driver.id}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-2 rounded bg-card border cursor-move text-sm ${
                                snapshot.isDragging ? 'shadow-lg bg-primary text-primary-foreground' : ''
                              }`}
                            >
                              <div className="font-medium">{driver.full_name}</div>
                              <div className="text-xs opacity-75">{driver.phone}</div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {availableResources.drivers.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No drivers available</p>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Available Equipment */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Equipment ({availableResources.equipment.length})
                </h4>
                <Droppable droppableId="available-equipment">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-2 p-2 rounded border-2 border-dashed ${
                        snapshot.isDraggingOver ? 'bg-accent border-primary' : 'border-border'
                      }`}
                    >
                      {availableResources.equipment.map((item, index) => (
                        <Draggable key={item.id} draggableId={`equipment-${item.id}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-2 rounded bg-card border cursor-move text-sm ${
                                snapshot.isDragging ? 'shadow-lg bg-primary text-primary-foreground' : ''
                              }`}
                            >
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs opacity-75">Available: {item.quantity_available}</div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {availableResources.equipment.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No equipment available</p>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Resources */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment for {booking.booking_ref}</CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="assigned">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`min-h-64 p-4 rounded border-2 ${
                      snapshot.isDraggingOver ? 'bg-accent border-primary' : 'bg-card border-border border-dashed'
                    }`}
                  >
                    {assignedResources.vehicles.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Assigned Vehicles</h4>
                        <div className="space-y-2">
                          {assignedResources.vehicles.map(v => (
                            <div key={v.id} className="p-2 bg-card rounded border flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{v.name}</div>
                                <div className="text-xs text-muted-foreground">{v.registration_number}</div>
                              </div>
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {assignedResources.drivers.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Assigned Drivers</h4>
                        <div className="space-y-2">
                          {assignedResources.drivers.map(d => (
                            <div key={d.id} className="p-2 bg-card rounded border flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{d.full_name}</div>
                                <div className="text-xs text-muted-foreground">{d.phone}</div>
                              </div>
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {assignedResources.equipment.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Assigned Equipment</h4>
                        <div className="space-y-2">
                          {assignedResources.equipment.map(e => (
                            <div key={e.id} className="p-2 bg-card rounded border flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{e.name}</div>
                                <div className="text-xs text-muted-foreground">{e.category}</div>
                              </div>
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {assignedResources.vehicles.length === 0 &&
                      assignedResources.drivers.length === 0 &&
                      assignedResources.equipment.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Drag resources here to assign them to this booking
                        </p>
                      )}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>
      </div>
    </DragDropContext>
  );
}