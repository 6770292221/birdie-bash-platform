import { Request, Response } from 'express';
import Court from '../models/Court';
import Event from '../models/Event';
import { ICourtCreate } from '../types/event';
export const createCourt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const courtData: ICourtCreate = {
      eventId,
      ...req.body,
    };

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const court = new Court(courtData);
    await court.save();

    res.status(201).json({
      message: 'Court created successfully',
      court: {
        id: court._id,
        eventId: court.eventId,
        courtNumber: court.courtNumber,
        maxPlayers: court.maxPlayers,
        currentPlayers: court.currentPlayers,
        status: court.status,
        createdAt: court.createdAt,
        updatedAt: court.updatedAt,
      },
    });
  } catch (error) {
    console.error('Create court error:', error);
    if ((error as any).code === 11000) {
      res.status(400).json({ error: 'Court number already exists for this event' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCourts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const courts = await Court.find({ eventId }).sort({ courtNumber: 1 });

    res.status(200).json({
      courts: courts.map(court => ({
        id: court._id,
        eventId: court.eventId,
        courtNumber: court.courtNumber,
        maxPlayers: court.maxPlayers,
        currentPlayers: court.currentPlayers,
        status: court.status,
        createdAt: court.createdAt,
        updatedAt: court.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get courts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCourt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, courtId } = req.params;

    const court = await Court.findOne({ _id: courtId, eventId });

    if (!court) {
      res.status(404).json({ error: 'Court not found' });
      return;
    }

    res.status(200).json({
      court: {
        id: court._id,
        eventId: court.eventId,
        courtNumber: court.courtNumber,
        maxPlayers: court.maxPlayers,
        currentPlayers: court.currentPlayers,
        status: court.status,
        createdAt: court.createdAt,
        updatedAt: court.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get court error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCourt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, courtId } = req.params;
    const updateData = req.body;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const court = await Court.findOneAndUpdate(
      { _id: courtId, eventId },
      updateData,
      { new: true }
    );

    if (!court) {
      res.status(404).json({ error: 'Court not found' });
      return;
    }

    res.status(200).json({
      message: 'Court updated successfully',
      court: {
        id: court._id,
        eventId: court.eventId,
        courtNumber: court.courtNumber,
        maxPlayers: court.maxPlayers,
        currentPlayers: court.currentPlayers,
        status: court.status,
        createdAt: court.createdAt,
        updatedAt: court.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update court error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCourt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, courtId } = req.params;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const court = await Court.findOneAndDelete({ _id: courtId, eventId });

    if (!court) {
      res.status(404).json({ error: 'Court not found' });
      return;
    }

    res.status(200).json({
      message: 'Court deleted successfully',
    });
  } catch (error) {
    console.error('Delete court error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};