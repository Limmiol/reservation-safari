import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Clock, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';

const DEFAULT_TRAVEL_TIME = 2; // hours between locations

export default function ItineraryBuilder({ packageData, onSave }) {
  const [days, setDays] = useState(
    packageData?.itinerary_days 
      ? JSON.parse(packageData.itinerary_days)
      : [{ day: 1, description: '', activities: [], accommodation: '', meals: '' }]
  );

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return;
    
    const dayIndex = parseInt(draggableId.split('-')[1]);
    const newDays = JSON.parse(JSON.stringify(days));
    
    const [activity] = newDays[dayIndex].activities.splice(source.index, 1);
    newDays[dayIndex].activities.splice(destination.index, 0, activity);
    
    setDays(newDays);
  };

  const addDay = () => {
    setDays([...days, {
      day: days.length + 1,
      description: '',
      activities: [],
      accommodation: '',
      meals: ''
    }]);
  };

  const addActivity = (dayIndex) => {
    const newDays = [...days];
    newDays[dayIndex].activities.push({
      id: Date.now(),
      time: '08:00',
      title: 'New Activity',
      location: '',
      description: ''
    });
    setDays(newDays);
  };

  const updateActivity = (dayIndex, actIndex, field, value) => {
    const newDays = [...days];
    newDays[dayIndex].activities[actIndex][field] = value;
    setDays(newDays);
  };

  const deleteActivity = (dayIndex, actIndex) => {
    const newDays = [...days];
    newDays[dayIndex].activities.splice(actIndex, 1);
    setDays(newDays);
  };

  const updateDayField = (dayIndex, field, value) => {
    const newDays = [...days];
    newDays[dayIndex][field] = value;
    setDays(newDays);
  };

  const calculateTravelTime = (location1, location2) => {
    // Simple placeholder - in production, use distance API
    return DEFAULT_TRAVEL_TIME;
  };

  const handleSave = () => {
    onSave(JSON.stringify(days));
  };

  return (
    <div className="space-y-6">
      <DragDropContext onDragEnd={handleDragEnd}>
        {days.map((day, dayIndex) => (
          <Card key={dayIndex} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Day {day.day}</h3>
                <Input
                  placeholder="Day description (e.g., 'Arrival and welcome dinner')"
                  value={day.description}
                  onChange={(e) => updateDayField(dayIndex, 'description', e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium">Accommodation</label>
                <Input
                  placeholder="Hotel/Lodge name"
                  value={day.accommodation}
                  onChange={(e) => updateDayField(dayIndex, 'accommodation', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Meals Included</label>
                <Input
                  placeholder="e.g., B, L, D"
                  value={day.meals}
                  onChange={(e) => updateDayField(dayIndex, 'meals', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Activities (Drag to reorder)</h4>
              <Droppable droppableId={`day-${dayIndex}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 p-3 rounded-lg border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    {day.activities.map((activity, actIndex) => (
                      <Draggable
                        key={activity.id}
                        draggableId={`activity-${dayIndex}-${actIndex}`}
                        index={actIndex}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-card border border-border rounded-lg p-3 space-y-2 transition-all ${
                              snapshot.isDragging ? 'shadow-lg bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex gap-2 items-start">
                              <Input
                                type="time"
                                value={activity.time}
                                onChange={(e) => updateActivity(dayIndex, actIndex, 'time', e.target.value)}
                                className="w-24"
                              />
                              <Input
                                placeholder="Activity title"
                                value={activity.title}
                                onChange={(e) => updateActivity(dayIndex, actIndex, 'title', e.target.value)}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteActivity(dayIndex, actIndex)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="flex gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                              <Input
                                placeholder="Location"
                                value={activity.location}
                                onChange={(e) => updateActivity(dayIndex, actIndex, 'location', e.target.value)}
                                className="flex-1 text-sm"
                              />
                            </div>

                            <Input
                              placeholder="Activity description"
                              value={activity.description}
                              onChange={(e) => updateActivity(dayIndex, actIndex, 'description', e.target.value)}
                              className="text-sm"
                            />

                            {actIndex < day.activities.length - 1 && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                                <Clock className="w-3 h-3" />
                                <span>Travel time: ~{calculateTravelTime(activity.location, day.activities[actIndex + 1]?.location)} hours</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <Button
                variant="outline"
                size="sm"
                onClick={() => addActivity(dayIndex)}
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Activity
              </Button>
            </div>
          </Card>
        ))}
      </DragDropContext>

      <div className="flex gap-2">
        <Button onClick={addDay} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Day
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Save Itinerary
        </Button>
      </div>
    </div>
  );
}