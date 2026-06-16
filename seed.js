import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import { Conversation, Message } from "../src/models/Conversation.js";

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/nexachat");
  console.log("Connected. Seeding…");

  await User.deleteMany({});
  await Conversation.deleteMany({});
  await Message.deleteMany({});

  const users = await User.create([
    { firstName: "Alice", lastName: "Johnson", username: "alice_j",  email: "alice@example.com",  password: "password123", isVerified: true, bio: "Living my best life ✨" },
    { firstName: "Bob",   lastName: "Smith",   username: "bob_smith",email: "bob@example.com",    password: "password123", isVerified: true, bio: "Coffee enthusiast ☕" },
    { firstName: "Carol", lastName: "Davis",   username: "carol_d",  email: "carol@example.com",  password: "password123", isVerified: true, bio: "Software engineer 👩‍💻" },
    { firstName: "Demo",  lastName: "User",    username: "demo",     email: "demo@example.com",   password: "password123", isVerified: true, bio: "Try out NexaChat!" },
  ]);

  console.log(`Created ${users.length} users`);

  const [alice, bob, carol, demo] = users;

  const conv1 = await Conversation.create({
    participants: [demo._id, alice._id],
    isGroup: false,
    meta: [{ user: demo._id, unreadCount: 0 }, { user: alice._id, unreadCount: 1 }],
  });

  const msg1 = await Message.create({
    conversation: conv1._id, sender: demo._id, content: "Hey Alice! How's it going?", type: "text", status: "read",
  });
  const msg2 = await Message.create({
    conversation: conv1._id, sender: alice._id, content: "Hi! I'm doing great, thanks for asking 😊", type: "text", status: "delivered",
  });
  conv1.lastMessage = msg2._id;
  await conv1.save();

  const groupConv = await Conversation.create({
    isGroup: true,
    name: "Weekend Trip Planning",
    description: "Let's plan our trip!",
    participants: [demo._id, alice._id, bob._id, carol._id],
    admins: [demo._id],
    meta: [demo._id, alice._id, bob._id, carol._id].map((id) => ({ user: id, unreadCount: 0 })),
  });

  const gmsg = await Message.create({
    conversation: groupConv._id, sender: bob._id, content: "Excited for this trip! 🎉", type: "text", status: "sent",
  });
  groupConv.lastMessage = gmsg._id;
  await groupConv.save();

  console.log("Seed data created successfully!");
  console.log("\nDemo accounts (password: password123):");
  users.forEach((u) => console.log(`  - ${u.username} (${u.email})`));

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });
