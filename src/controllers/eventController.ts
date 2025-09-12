import { Request, Response } from 'express';
import Event from '../models/Event';
import { IEventCreate, IEventUpdate } from '../types/event';
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventData: IEventCreate = {
      ...req.body,
      createdBy: req.body.createdBy || 'system',
    };

    const event = new Event(eventData);
    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        id: event._id,
        name: event.name,
        description: event.description,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        maxParticipants: event.maxParticipants,
        currentParticipants: event.currentParticipants,
        status: event.status,
        location: event.location,
        createdBy: event.createdBy,
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
    if (status) filter.status = status;
    if (date) filter.date = new Date(date as string);

    const events = await Event.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: 1, startTime: 1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      events: events.map(event => ({
        id: event._id,
        name: event.name,
        description: event.description,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        maxParticipants: event.maxParticipants,
        currentParticipants: event.currentParticipants,
        status: event.status,
        location: event.location,
        createdBy: event.createdBy,
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

    const event = await Event.findById(id).populate('createdBy', 'name email');

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.status(200).json({
      event: {
        id: event._id,
        name: event.name,
        description: event.description,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        maxParticipants: event.maxParticipants,
        currentParticipants: event.currentParticipants,
        status: event.status,
        location: event.location,
        createdBy: event.createdBy,
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

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json({
      message: 'Event updated successfully',
      event: {
        id: updatedEvent!._id,
        name: updatedEvent!.name,
        description: updatedEvent!.description,
        date: updatedEvent!.date,
        startTime: updatedEvent!.startTime,
        endTime: updatedEvent!.endTime,
        maxParticipants: updatedEvent!.maxParticipants,
        currentParticipants: updatedEvent!.currentParticipants,
        status: updatedEvent!.status,
        location: updatedEvent!.location,
        createdBy: updatedEvent!.createdBy,
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

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    await Event.findByIdAndDelete(id);

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

    const event = await Event.findById(id);

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const availableSlots = event.maxParticipants - event.currentParticipants;
    const isAcceptingRegistrations = event.status === 'active' && availableSlots > 0;

    res.status(200).json({
      eventId: event._id,
      status: event.status,
      maxParticipants: event.maxParticipants,
      currentParticipants: event.currentParticipants,
      availableSlots,
      isAcceptingRegistrations,
      waitlistEnabled: event.status === 'active' && availableSlots <= 0,
    });
  } catch (error) {
    console.error('Get event status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};