using Microsoft.AspNetCore.Mvc;
using SimpleAzureOpenAIChatbot.AI;
using SimpleAzureOpenAIChatbot.Extensions;
using SimpleAzureOpenAIChatbot.Models;
using System.ClientModel;

namespace SimpleAzureOpenAIChatbot.Controllers
{
    public class TungBotController : Controller
    {
        private readonly ILogger<HomeController> _logger;

        private readonly AzureChatClient _aiClient_Chat;
        private readonly FluxImageClient _aiClient_Img_FLUX;
        private readonly AzureTTSClient _aiClient_TTS;

        private readonly string _endpoint_chat = SystemSettings.AI_Chat_Endpoint;
        private readonly string _deploymentName_Chat = SystemSettings.AI_Chat_DeploymentName;
        private readonly string _apiKey_chat = SystemSettings.AI_Chat_ApiKey;
        private readonly string _endpoint_img_FLUX = SystemSettings.AI_Img_Endpoint_FLUX;
        private readonly string _deploymentName_Img_FLUX = SystemSettings.AI_Img_DeploymentName_FLUX;
        private readonly string _apiKey_img_FLUX = SystemSettings.AI_Img_ApiKey_FLUX;
        private readonly string _endpoint_tts = SystemSettings.AI_TTS_Endpoint;
        private readonly string _deploymentName_TTS = SystemSettings.AI_TTS_DeploymentName;
        private readonly string _apiKey_tts = SystemSettings.AI_TTS_ApiKey;

        public TungBotController(ILogger<HomeController> logger)
        {
            _logger = logger;

            _aiClient_Chat = new AzureChatClient(new Uri(_endpoint_chat), new ApiKeyCredential(_apiKey_chat), _deploymentName_Chat);
            _aiClient_Img_FLUX = new FluxImageClient(new Uri(_endpoint_img_FLUX), new ApiKeyCredential(_apiKey_img_FLUX), _deploymentName_Img_FLUX);
            _aiClient_TTS = new AzureTTSClient(new Uri(_endpoint_tts), new ApiKeyCredential(_apiKey_tts), _deploymentName_TTS);
        }

        // Load the chat window (GET request)
        public IActionResult Index()
        {
            var chatHistory = HttpContext.Session.Get<List<string>>("ChatHistory") ?? new List<string>();
            if (chatHistory.Count == 0)
            {
                chatHistory.Add("TungBot: Hello, my name is TungBot, how may I help you today?");
                HttpContext.Session.Set("ChatHistory", chatHistory);
            }

            var imgReqHistory = HttpContext.Session.Get<List<string>>("ImgReqHistory") ?? new List<string>();
            if (imgReqHistory.Count == 0)
            {
                imgReqHistory.Add("TungBot: Hello, my name is TungBot, which image would you like to create?");
                HttpContext.Session.Set("ImgReqHistory", imgReqHistory);
            }

            var model = new ChatViewModel
            {
                ChatHistory = chatHistory,
                ImgReqHistory = imgReqHistory
            };
            return View(model);
        }


        // Handle user input and return AI response (POST request)
        [HttpPost]
        public async Task<IActionResult> IndexAsync(ChatViewModel model)
        {
            var chatHistory = HttpContext.Session.Get<List<string>>("ChatHistory") ?? new List<string>();
            var chatMemory_BeginningConversation = HttpContext.Session.Get<List<ChatMessage>>("ChatMemory_BeginningConversation") ?? new List<ChatMessage>();
            var chatMemory = HttpContext.Session.Get<List<ChatMessage>>("ChatMemory") ?? new List<ChatMessage>();
            var imgReqHistory = HttpContext.Session.Get<List<string>>("ImgReqHistory") ?? new List<string>();

            if (!string.IsNullOrEmpty(model.UserInput))
            {
                var isNewConversation = (chatMemory_BeginningConversation.Count == 0);

                //CASE 1: Completely new conversation or the second prompt from user, we want to keep the first 2 prompts of the conversation in a separate memory variable (chatMemory_BeginningConversation) to make sure the AI can understand the user's wishes and the context of the conversation, even if the user later on sends many other prompts that might "push out" the first ones from the main chatMemory (considering token limit of the model)
                if (chatMemory_BeginningConversation.Where(x => x.Role == "user").ToList().Count < 2)
                {
                    chatMemory_BeginningConversation.Add(ChatMessage.User(model.UserInput));
                }
                //CASE 2: Continous conversation, we want to keep adding the user prompts and AI responses into the main chatMemory variable, which will be sent to the AI model as context for each new prompt
                else
                {
                    chatMemory.Add(ChatMessage.User(model.UserInput));
                }

                var chatMessages = new List<ChatMessage>();
                if (!isNewConversation)
                {
                    //IF NOT a completely new conversation
                    chatMessages.Add(ChatMessage.System("You are a helpful assistant. Remember the full conversation history and answer accordingly."));
                }
                chatMessages.AddRange(chatMemory_BeginningConversation);
                // In addition to the "start chat" messages, only saves the most recent messages.
                const int maxMessages = 3;
                if (chatMemory.Count > maxMessages + 1)
                {
                    chatMessages.AddRange(chatMemory.Skip(chatMemory.Count - maxMessages));
                }
                else
                {
                    chatMessages.AddRange(chatMemory);
                }

                ChatCompletion completion = _aiClient_Chat.CompleteChat(chatMessages);
                var chatResponse = completion.Content;

                if (chatMemory.Count == 0)
                    chatMemory_BeginningConversation.Add(ChatMessage.Assistant(chatResponse));
                else
                    chatMemory.Add(ChatMessage.Assistant(chatResponse));

                chatHistory.Add($"You: {model.UserInput}");
                chatHistory.Add($"TungBot: {chatResponse}");

                HttpContext.Session.Set("ChatHistory", chatHistory);
                HttpContext.Session.Set("ChatMemory_BeginningConversation", chatMemory_BeginningConversation);
                HttpContext.Session.Set("ChatMemory", chatMemory);
                model.UserInput = string.Empty;
            }

            if (!string.IsNullOrEmpty(model.UserImgReqInput))
            {
                FluxGeneratedImage generatedImage = await _aiClient_Img_FLUX.GenerateImageAsync(
                    model.UserImgReqInput,
                    new FluxImageGenerationOptions
                    {
                        Size = "1024x1024",
                        N = 1
                    });

                byte[] pngBytes = generatedImage.ImageData!.ToArray();
                string base64 = Convert.ToBase64String(pngBytes);
                string imgHTML = $"<img src=\"data:image/png;base64,{base64}\" width=\"150\" height=\"150\" alt=\"\">";

                imgReqHistory.Add($"You: {model.UserImgReqInput}");
                imgReqHistory.Add($"TungBot: {imgHTML}");

                HttpContext.Session.Set("ImgReqHistory", imgReqHistory);
                model.UserImgReqInput = string.Empty;
            }

            model.ChatHistory = chatHistory;
            model.ImgReqHistory = imgReqHistory;

            return View(model);
        }

        [HttpPost]
        public async Task<IActionResult> SpeakText([FromBody] SpeakRequest req)
        {
            try
            {
                var speech = await _aiClient_TTS.GenerateSpeechAsync(
                    req.Text,
                new AI.SpeechGenerationOptions
                {
                    Voice = TTSVoice.Nova,   // or Alloy, Echo, Onyx...
                    Speed = 1.0f
                });

                return File(speech.AudioData.ToArray(), speech.ContentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TTS Generation Error");
                Console.WriteLine($"[TTS] EXCEPTION: {ex.GetType().Name}: {ex.Message}");
                Console.WriteLine($"[TTS] Stack: {ex.StackTrace}");
                return StatusCode(500, ex.Message);
            }
        }

        public class SpeakRequest
        {
            public string Text { get; set; } = "";
        }
    }
}