using System.ClientModel;
using System.Text.Json.Serialization;

namespace SimpleAzureOpenAIChatbot.AI
{
    //public class UserChatMessage : ChatMessage
    //{
    //    public UserChatMessage(string content) : base("user", content)
    //    {
    //    }
    //}

    // ─────────────────────────────────────────────────────────────────────────
    // Options & Result models
    // ─────────────────────────────────────────────────────────────────────────

    public class ChatMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; }

        [JsonPropertyName("content")]
        public string Content { get; set; }

        public ChatMessage() { }  // ← thêm dòng này cho JSON deserializer

        public ChatMessage(string role, string content)
        {
            Role    = role;
            Content = content;
        }

        public static ChatMessage System(string content)    => new("system",    content);
        public static ChatMessage User(string content)      => new("user",      content);
        public static ChatMessage Assistant(string content) => new("assistant", content);
    }

    public class ChatCompletionOptions
    {
        /// <summary>Sampling temperature 0–2. Default: 0.7.</summary>
        public float? Temperature { get; set; }

        /// <summary>Nucleus sampling. Alternative to temperature.</summary>
        public float? TopP { get; set; }

        /// <summary>Max tokens to generate.</summary>
        public int? MaxTokens { get; set; }

        /// <summary>Stop sequences.</summary>
        public string[]? Stop { get; set; }
    }

    public class ChatCompletion
    {
        /// <summary>The assistant reply text.</summary>
        public string Content { get; }

        /// <summary>Finish reason (e.g. "stop", "length", "end_turn").</summary>
        public string? FinishReason { get; }

        /// <summary>Total tokens consumed. -1 if not reported.</summary>
        public int TotalTokens { get; }

        internal ChatCompletion(string content, string? finishReason, int totalTokens)
        {
            Content      = content;
            FinishReason = finishReason;
            TotalTokens  = totalTokens;
        }

        public override string ToString() => Content;
    }

    // ── Internal DTOs — Chat Completions API (/chat/completions) ─────────────

    internal sealed class ChatCompletionsRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = "";

        [JsonPropertyName("messages")]
        public List<ChatMessage> Messages { get; set; } = new();

        [JsonPropertyName("temperature")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public float? Temperature { get; set; }

        [JsonPropertyName("top_p")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public float? TopP { get; set; }

        [JsonPropertyName("max_tokens")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? MaxTokens { get; set; }

        [JsonPropertyName("stop")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string[]? Stop { get; set; }
    }

    internal sealed class ChatCompletionsResponse
    {
        [JsonPropertyName("choices")]
        public ChatCompletionsChoice[]? Choices { get; set; }

        [JsonPropertyName("usage")]
        public ChatUsage? Usage { get; set; }

        [JsonPropertyName("error")]
        public ChatApiError? Error { get; set; }
    }

    internal sealed class ChatCompletionsChoice
    {
        [JsonPropertyName("message")]
        public ChatMessage? Message { get; set; }

        [JsonPropertyName("finish_reason")]
        public string? FinishReason { get; set; }
    }

    // ── Internal DTOs — Responses API (/openai/responses) ────────────────────

    internal sealed class ResponsesApiRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = "";

        [JsonPropertyName("input")]
        public List<ResponsesApiMessage> Input { get; set; } = new();

        [JsonPropertyName("temperature")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public float? Temperature { get; set; }

        [JsonPropertyName("top_p")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public float? TopP { get; set; }

        [JsonPropertyName("max_output_tokens")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? MaxOutputTokens { get; set; }
    }

    internal sealed class ResponsesApiMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = "";

        [JsonPropertyName("content")]
        public string Content { get; set; } = "";
    }

    internal sealed class ResponsesApiResponse
    {
        // output is an array of output items
        [JsonPropertyName("output")]
        public ResponsesApiOutputItem[]? Output { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("usage")]
        public ResponsesApiUsage? Usage { get; set; }

        [JsonPropertyName("error")]
        public ChatApiError? Error { get; set; }
    }

    internal sealed class ResponsesApiOutputItem
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        // For type = "message"
        [JsonPropertyName("content")]
        public ResponsesApiContent[]? Content { get; set; }
    }

    internal sealed class ResponsesApiContent
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        // For type = "output_text"
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    internal sealed class ResponsesApiUsage
    {
        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }
    }

    // Shared
    internal sealed class ChatUsage
    {
        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }
    }

    internal sealed class ChatApiError
    {
        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Client
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Azure OpenAI chat client. Supports BOTH API styles — auto-detected:
    ///
    ///   Responses API  → endpoint contains "/openai/responses"
    ///     POST directly, model name in body, "input" array.
    ///
    ///   Chat Completions API  → everything else
    ///     POST to /openai/deployments/{name}/chat/completions, "messages" array.
    ///
    /// <example><code>
    /// // Responses API (your current setup):
    /// _aiClient_Chat = new AzureChatClient(
    ///     new Uri(_endpoint_chat),          // full URL with /openai/responses
    ///     new ApiKeyCredential(_apiKey_chat),
    ///     _deploymentName_Chat);            // "tungtest-gpt-5-mini"
    ///
    /// // Chat Completions API:
    /// _aiClient_Chat = new AzureChatClient(
    ///     new Uri("https://xxx.openai.azure.com"),
    ///     new ApiKeyCredential(_apiKey_chat),
    ///     "gpt-4o",
    ///     apiVersion: "2025-01-01-preview");
    ///
    /// // Usage — same for both:
    /// ChatCompletion reply = await _aiClient_Chat.CompleteChatAsync(
    ///     new List&lt;ChatMessage&gt;
    ///     {
    ///         ChatMessage.System("You are TungBot."),
    ///         ChatMessage.User("Hello!")
    ///     });
    /// string text = reply.Content;
    /// </code></example>
    /// </summary>
    public sealed class AzureChatClient : AzureAIClientBase
    {
        private const string ChatCompletionsPath = "/chat/completions";
        private const string ResponsesApiPath    = "/openai/responses";
        private const string DefaultApiVersion   = "2025-04-01-preview";

        private readonly bool _useResponsesApi;

        // ── Construction ──────────────────────────────────────────────────────

        public AzureChatClient(
            Uri              endpoint,
            ApiKeyCredential credential,
            string           deploymentName,
            string           apiVersion  = DefaultApiVersion,
            HttpClient?      httpClient  = null)
            : this(endpoint.ToString(),
                   AzureAIClientBase.ExtractKey(credential),
                   deploymentName, apiVersion, httpClient)
        { }

        public AzureChatClient(
            string      endpoint,
            string      apiKey,
            string      deploymentName,
            string      apiVersion  = DefaultApiVersion,
            HttpClient? httpClient  = null)
            : base(endpoint, apiKey, deploymentName,
                   // Pass the correct resourcePath based on endpoint style
                   endpoint.Contains(ResponsesApiPath, StringComparison.OrdinalIgnoreCase)
                       ? ResponsesApiPath
                       : ChatCompletionsPath,
                   apiVersion,
                   authScheme: "api-key", httpClient)
        {
            _useResponsesApi = endpoint.Contains(ResponsesApiPath,
                StringComparison.OrdinalIgnoreCase);
        }

        // ── Public API ────────────────────────────────────────────────────────

        public ChatCompletion CompleteChat(
            IEnumerable<ChatMessage> messages,
            ChatCompletionOptions?   options = null)
            => CompleteChatAsync(messages, options).GetAwaiter().GetResult();

        public async Task<ChatCompletion> CompleteChatAsync(
            IEnumerable<ChatMessage> messages,
            ChatCompletionOptions?   options           = null,
            CancellationToken        cancellationToken = default)
        {
            options ??= new ChatCompletionOptions();

            return _useResponsesApi
                ? await CallResponsesApiAsync(messages, options, cancellationToken)
                : await CallChatCompletionsApiAsync(messages, options, cancellationToken);
        }

        // ── Responses API  (/openai/responses) ───────────────────────────────

        private async Task<ChatCompletion> CallResponsesApiAsync(
            IEnumerable<ChatMessage> messages,
            ChatCompletionOptions    options,
            CancellationToken        cancellationToken)
        {
            var input = new List<ResponsesApiMessage>();
            foreach (var m in messages)
                input.Add(new ResponsesApiMessage { Role = m.Role, Content = m.Content });

            var payload = new ResponsesApiRequest
            {
                Model           = DeploymentName,
                Input           = input,
                Temperature     = options.Temperature,
                TopP            = options.TopP,
                MaxOutputTokens = options.MaxTokens,
            };

            using var response = await PostJsonAsync(payload, cancellationToken);

            var apiResp = await response.Content
                .ReadFromJsonAsync<ResponsesApiResponse>(cancellationToken: cancellationToken)
                .ConfigureAwait(false)
                ?? throw new InvalidOperationException("Empty response body.");

            if (apiResp.Error is { } err)
                throw new InvalidOperationException(
                    $"Azure Responses API error [{err.Code}]: {err.Message}");

            // Extract text from output[].content[type=output_text].text
            string content = "";
            string? finishReason = apiResp.Status;

            if (apiResp.Output != null)
            {
                foreach (var item in apiResp.Output)
                {
                    if (item.Type == "message" && item.Content != null)
                    {
                        foreach (var c in item.Content)
                        {
                            if (c.Type == "output_text" && c.Text != null)
                            {
                                content += c.Text;
                            }
                        }
                    }
                }
            }

            return new ChatCompletion(content, finishReason,
                apiResp.Usage?.TotalTokens ?? -1);
        }

        // ── Chat Completions API  (/chat/completions) ─────────────────────────

        private async Task<ChatCompletion> CallChatCompletionsApiAsync(
            IEnumerable<ChatMessage> messages,
            ChatCompletionOptions    options,
            CancellationToken        cancellationToken)
        {
            var payload = new ChatCompletionsRequest
            {
                Model       = DeploymentName,
                Messages    = new List<ChatMessage>(messages),
                Temperature = options.Temperature,
                TopP        = options.TopP,
                MaxTokens   = options.MaxTokens,
                Stop        = options.Stop,
            };

            using var response = await PostJsonAsync(payload, cancellationToken);

            var apiResp = await response.Content
                .ReadFromJsonAsync<ChatCompletionsResponse>(cancellationToken: cancellationToken)
                .ConfigureAwait(false)
                ?? throw new InvalidOperationException("Empty response body.");

            if (apiResp.Error is { } err)
                throw new InvalidOperationException(
                    $"Azure Chat error [{err.Code}]: {err.Message}");

            if (apiResp.Choices == null || apiResp.Choices.Length == 0)
                throw new InvalidOperationException("No choices returned.");

            var choice = apiResp.Choices[0];
            return new ChatCompletion(
                content:      choice.Message?.Content ?? string.Empty,
                finishReason: choice.FinishReason,
                totalTokens:  apiResp.Usage?.TotalTokens ?? -1);
        }
    }
}
