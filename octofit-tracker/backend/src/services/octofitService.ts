import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' || !mongoose.isObjectIdOrHexString(userId) ||
    typeof teamId !== 'string' || !mongoose.isObjectIdOrHexString(teamId) ||
    typeof type !== 'string' || type.trim().length === 0 ||
    typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0
  ) {
    throw Object.assign(new Error('Activity input is invalid'), { status: 400 });
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!userExists || !teamExists) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(_input: unknown) {
  if (typeof _input !== 'object' || _input === null || Array.isArray(_input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const { name, mascot, members = [] } = _input as Record<string, unknown>;
  if (
    typeof name !== 'string' || name.trim().length === 0 ||
    typeof mascot !== 'string' || mascot.trim().length === 0 ||
    !Array.isArray(members) ||
    !members.every((member) => typeof member === 'string' && mongoose.isObjectIdOrHexString(member))
  ) {
    throw Object.assign(new Error('Team input is invalid'), { status: 400 });
  }

  const memberIds = members as string[];
  if (memberIds.length > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: memberIds } });
    if (existingMembers !== memberIds.length) {
      throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
    }
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);
  const teams = await Team.find({ _id: { $in: totals.map(({ _id }) => _id) } }).select('_id name').lean();
  const teamNames = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return totals.flatMap(({ _id, totalPoints }) => {
    const teamName = teamNames.get(_id.toString());
    return teamName ? [{ teamName, totalPoints }] : [];
  }).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).select('_id fitnessGoal').lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const activities = await Activity.find({ user: user._id })
    .sort({ occurredAt: -1 })
    .limit(10)
    .select('type')
    .lean();
  const focusForActivity = (type: string) => {
    switch (type.trim().toLowerCase()) {
      case 'run':
      case 'cycle':
      case 'swim':
        return 'endurance';
      case 'strength':
        return 'strength';
      case 'walk':
      case 'yoga':
        return 'mobility';
      default:
        return type.trim().toLowerCase();
    }
  };
  const goal = user.fitnessGoal.trim().toLowerCase();
  const recentFocuses = activities.map(({ type }) => focusForActivity(type));
  const priorities = [goal, ...recentFocuses.filter((focus) => focus !== goal)];
  const workouts = await Workout.find().lean();
  workouts.sort((left, right) => {
    const leftPriority = priorities.indexOf(left.focus.trim().toLowerCase());
    const rightPriority = priorities.indexOf(right.focus.trim().toLowerCase());
    return (leftPriority < 0 ? Number.MAX_SAFE_INTEGER : leftPriority) -
      (rightPriority < 0 ? Number.MAX_SAFE_INTEGER : rightPriority);
  });

  return workouts.map((workout) => {
    const workoutFocus = workout.focus.trim().toLowerCase();
    const recentActivity = activities.find(({ type }) => focusForActivity(type) === workoutFocus);
    const reason = workoutFocus === goal
      ? `Supports your ${user.fitnessGoal} goal${recentActivity ? ` and recent ${recentActivity.type} activity` : ''}.`
      : recentActivity
        ? `Builds on your recent ${recentActivity.type} activity.`
        : `A ${workout.focus} option for your next session.`;
    return { ...workout, reason };
  });
}

export { User };
