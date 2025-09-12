import { Request, Response } from 'express';
import Event from '../models/Event';
import { IEventCreate, IEventUpdate } from '../types/event';

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventData: IEventCreate = req.body;

    const event = new Event(eventData);
    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        id: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        status: event.status,
        capacity: event.capacity,
        shuttlecockPrice: event.shuttlecockPrice,
        courtHourlyRate: event.courtHourlyRate,
        courts: event.courts,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, date, limit = 10, offset = 0 } = req.query;
    
    const filter: any = {};
    if (status) filter['status.state'] = status;
    if (date) filter.eventDate = date;

    const events = await Event.find(filter)
      .sort({ eventDate: 1, createdAt: 1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      events: events.map(event => ({
        id: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        status: event.status,
        capacity: event.capacity,
        shuttlecockPrice: event.shuttlecockPrice,
        courtHourlyRate: event.courtHourlyRate,
        courts: event.courts,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
      },
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await Event.findOne({ id });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.status(200).json({
      event: {
        id: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        status: event.status,
        capacity: event.capacity,
        shuttlecockPrice: event.shuttlecockPrice,
        courtHourlyRate: event.courtHourlyRate,
        courts: event.courts,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: IEventUpdate = req.body;

    const event = await Event.findOne({ id });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const updatedEvent = await Event.findOneAndUpdate({ id }, updateData, { new: true });

    res.status(200).json({
      message: 'Event updated successfully',
      event: {
        id: updatedEvent!.id,
        eventName: updatedEvent!.eventName,
        eventDate: updatedEvent!.eventDate,
        location: updatedEvent!.location,
        status: updatedEvent!.status,
        capacity: updatedEvent!.capacity,
        shuttlecockPrice: updatedEvent!.shuttlecockPrice,
        courtHourlyRate: updatedEvent!.courtHourlyRate,
        courts: updatedEvent!.courts,
        createdAt: updatedEvent!.createdAt,
        updatedAt: updatedEvent!.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await Event.findOne({ id });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    await Event.findOneAndDelete({ id });

    res.status(200).json({
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEventStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await Event.findOne({ id });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const availableSlots = event.capacity.availableSlots;
    const isAcceptingRegistrations = event.status.isAcceptingRegistrations;

    res.status(200).json({
      id: event.id,
      status: event.status.state,
      maxParticipants: event.capacity.maxParticipants,
      currentParticipants: event.capacity.currentParticipants,
      availableSlots,
      isAcceptingRegistrations,
      waitlistEnabled: event.capacity.waitlistEnabled,
    });
  } catch (error) {
    console.error('Get event status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};