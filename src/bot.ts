import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";
import mongoose, { Document, Schema } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

interface IUser extends Document {
    userId: number;
    addedDate: Date;
}

const userSchema = new Schema<IUser>({
    userId: { type: Number, required: true },
    addedDate: { type: Date, required: true },
});

const User = mongoose.model<IUser>("User", userSchema);

const token: string = process.env.TOKEN_BOT as string;
const bot = new TelegramBot(token, { polling: true });

mongoose
    .connect(process.env.MONGODB_DATABASE_URL as string)
    .then(() => {
        console.log("Conectado ao MongoDB");
    })
    .catch((err) => {
        console.error("Erro ao conectar no MongoDB:", err);
    });

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    const userExists = await User.findOne({ userId });
    if (!userExists) {
        const newUser = new User({ userId, addedDate: new Date() });
        await newUser.save();
        bot.sendMessage(chatId, `Usuário ${userId} adicionado e monitorado.`);
    } else {
        bot.sendMessage(chatId, `Usuário ${userId} já está sendo monitorado.`);
    }
});

cron.schedule("0 0 * * *", async () => {
    const now = new Date();

    const users = await User.find({});
    users.forEach(async (user) => {
        const differenceInDays =
            (now.getTime() - new Date(user.addedDate).getTime()) /
            (1000 * 3600 * 24);
        if (differenceInDays >= 30) {
            await User.deleteOne({ userId: user.userId });

            bot.sendMessage(
                "Olá",
                `Usuário ${user.userId} foi removido após 30 dias.`
            );
        }
    });
});

cron.schedule("0 0 * * *", async () => {
    const now = new Date();

    const users = await User.find({});
    users.forEach(async (user) => {
        const differenceInDays =
            (now.getTime() - new Date(user.addedDate).getTime()) /
            (1000 * 3600 * 24);
        if (differenceInDays >= 28 && differenceInDays < 30) {
            bot.sendMessage(
                user.userId,
                "Você será removido do grupo em 2 dias."
            );
        }
    });
});
