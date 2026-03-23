const User = require("../models/User");
const getOwnerId = require("../utils/getOwnerId");

exports.getSettings = async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const user = await User.findById(ownerId).select("name email phone customUrl isUrlActive maxSimultaneousServices petshopName theme schedule");

        if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao buscar configurações" });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const { customUrl, isUrlActive, maxSimultaneousServices, petshopName, theme, schedule, validateOnly, onboardingCompleted } = req.body;

        // Se estiver enviando um customUrl, valida se não existe outro dono usando ele
        if (customUrl) {
            const existingUser = await User.findOne({
                customUrl,
                _id: { $ne: ownerId }, // Ignora o próprio usuário atual
            });

            if (existingUser) {
                return res.status(400).json({ message: "Esta URL já está em uso por outro Pet Shop." });
            }
        }

        if (validateOnly) {
            return res.json({ message: "URL disponível" });
        }

        // Build update object, only include maxSimultaneousServices if provided
        const updateFields = { customUrl, isUrlActive, petshopName, theme };
        if (maxSimultaneousServices !== undefined) {
            updateFields.maxSimultaneousServices = Math.max(1, parseInt(maxSimultaneousServices, 10) || 3);
        }
        if (schedule !== undefined) {
            updateFields.schedule = schedule;
        }
        if (onboardingCompleted !== undefined) {
            updateFields.onboardingCompleted = onboardingCompleted;
        }

        const updatedUser = await User.findByIdAndUpdate(
            ownerId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select("-password -emailToken -resetPasswordToken");

        res.json(updatedUser);
    } catch (err) {
        console.error(err);
        // Erro de duplicate key do Mongoose (E11000)
        if (err.code === 11000 && err.keyPattern && err.keyPattern.customUrl) {
            return res.status(400).json({ message: "Esta URL já está em uso por outro Pet Shop." });
        }
        res.status(500).json({ message: "Erro ao atualizar configurações" });
    }
};
