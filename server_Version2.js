const { GoogleGenerativeAI } = require("@google/generative-ai");

async function summarizeWithAI(text, summaryLength) {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Summarize the following text to approximately ${summaryLength}% of its original length. 
Keep the main ideas and important details:

${text}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}