using System.ClientModel;
using System.Text.Json.Serialization;

//https://azure.microsoft.com/en-us/pricing/details/ai-foundry-models/black-forest-labs/
//https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-flux?tabs=python
//https://github.com/microsoft-foundry/foundry-samples/blob/main/samples/python/black-forest-labs/flux/README.md
namespace SimpleAzureOpenAIChatbot.AI
{
    // ─────────────────────────────────────────────────────────────────────────
    // Options & Result models
    // ─────────────────────────────────────────────────────────────────────────

    public class FluxImageGenerationOptions
    {
        /// <summary>Number of images to generate. Default: 1.</summary>
        public int N { get; set; } = 1;

        /// <summary>Size in "WxH" format. Multiples of 32. Default: "1024x1024".</summary>
        public string Size { get; set; } = "1024x1024";

        /// <summary>
        /// FLUX.1-Kontext-pro only supports "b64_json".
        /// "url" may work on other FLUX variants.
        /// </summary>
        public string ResponseFormat { get; set; } = "b64_json";

        public int?   Seed           { get; set; }
        public float? GuidanceScale  { get; set; }
        public int?   Steps          { get; set; }
    }

    public class FluxGeneratedImage
    {
        /// <summary>Populated when ResponseFormat = "url".</summary>
        public Uri? SasUri { get; set; }

        /// <summary>Populated when ResponseFormat = "b64_json".</summary>
        public BinaryData? ImageData { get; set; }

        public string? RevisedPrompt { get; set; }

        public async Task<byte[]> DownloadImageBytesAsync(
            HttpClient? httpClient = null, CancellationToken ct = default)
        {
            if (SasUri == null) throw new InvalidOperationException(
                "SasUri is null. Use ResponseFormat = \"url\" to get a downloadable URI.");
            return await (httpClient ?? new HttpClient()).GetByteArrayAsync(SasUri, ct);
        }

        public async Task SaveToFileAsync(
            string filePath, HttpClient? httpClient = null, CancellationToken ct = default)
        {
            byte[] bytes = ImageData != null
                ? ImageData.ToArray()
                : await DownloadImageBytesAsync(httpClient, ct);
            await File.WriteAllBytesAsync(filePath, bytes, ct);
        }
    }

    // ── Internal DTOs ─────────────────────────────────────────────────────────

    internal sealed class FluxApiResponse
    {
        [JsonPropertyName("data")]    public FluxImageDatum[]? Data  { get; set; }
        [JsonPropertyName("error")]   public FluxApiError?     Error { get; set; }
    }

    internal sealed class FluxImageDatum
    {
        [JsonPropertyName("url")]            public string? Url           { get; set; }
        [JsonPropertyName("b64_json")]       public string? B64Json       { get; set; }
        [JsonPropertyName("revised_prompt")] public string? RevisedPrompt { get; set; }
    }

    internal sealed class FluxApiError
    {
        [JsonPropertyName("code")]    public string? Code    { get; set; }
        [JsonPropertyName("message")] public string? Message { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Client
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Azure AI Foundry FLUX image-generation client. Inherits URL-resolution
    /// and auth from <see cref="AzureAIClientBase"/>.
    ///
    /// <example><code>
    /// // Style 1 — Full URL (your current setup):
    /// _aiClient_Img_FLUX = new FluxImageClient(
    ///     new Uri(_endpoint_img_FLUX),
    ///     new ApiKeyCredential(_apiKey_img_FLUX));
    ///
    /// // Style 2 — Base URL:
    /// _aiClient_Img_FLUX = new FluxImageClient(
    ///     new Uri("https://xxx.services.ai.azure.com"),
    ///     new ApiKeyCredential(_apiKey_img_FLUX),
    ///     deploymentName: "tungtest-FLUX.1-Kontext-pro",
    ///     apiVersion:     "2025-04-01-preview");
    ///
    /// FluxGeneratedImage img = await _aiClient_Img_FLUX.GenerateImageAsync(
    ///     model.UserImgReqInput,
    ///     new FluxImageGenerationOptions { Size = "1024x1024" });
    ///
    /// byte[] png = img.ImageData!.ToArray();
    /// </code></example>
    /// </summary>
    public sealed class FluxImageClient : AzureAIClientBase
    {
        private const string ResourcePath      = "/images/generations";
        private const string DefaultApiVersion = "2025-04-01-preview";

        // ── Construction ──────────────────────────────────────────────────────

        public FluxImageClient(
            Uri              endpoint,
            ApiKeyCredential credential,
            string?          deploymentName = null,
            string           apiVersion     = DefaultApiVersion,
            HttpClient?      httpClient     = null)
            : base(endpoint, credential,
                   deploymentName ?? "flux",
                   ResourcePath, apiVersion,
                   authScheme: "Bearer", httpClient)
        { }

        public FluxImageClient(
            string      endpoint,
            string      apiKey,
            string?     deploymentName = null,
            string      apiVersion     = DefaultApiVersion,
            HttpClient? httpClient     = null)
            : base(endpoint, apiKey,
                   deploymentName ?? "flux",
                   ResourcePath, apiVersion,
                   authScheme: "Bearer", httpClient)
        { }

        // ── Public API ────────────────────────────────────────────────────────

        public FluxGeneratedImage GenerateImage(
            string prompt, FluxImageGenerationOptions? options = null)
            => GenerateImageAsync(prompt, options).GetAwaiter().GetResult();

        public async Task<FluxGeneratedImage> GenerateImageAsync(
            string                      prompt,
            FluxImageGenerationOptions? options           = null,
            CancellationToken           cancellationToken = default)
        {
            var results = await GenerateImagesAsync(prompt, options, cancellationToken);
            return results[0];
        }

        public async Task<FluxGeneratedImage[]> GenerateImagesAsync(
            string                      prompt,
            FluxImageGenerationOptions? options           = null,
            CancellationToken           cancellationToken = default)
        {
            options ??= new FluxImageGenerationOptions();

            using var response = await PostJsonAsync(BuildPayload(prompt, options), cancellationToken);

            var apiResp = await response.Content
                .ReadFromJsonAsync<FluxApiResponse>(cancellationToken: cancellationToken)
                .ConfigureAwait(false)
                ?? throw new InvalidOperationException("Empty response body.");

            if (apiResp.Error is { } err)
                throw new InvalidOperationException($"Azure AI error [{err.Code}]: {err.Message}");

            if (apiResp.Data == null || apiResp.Data.Length == 0)
                throw new InvalidOperationException("No images returned.");

            return MapResults(apiResp.Data);
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private static object BuildPayload(string prompt, FluxImageGenerationOptions opt)
        {
            var dict = new Dictionary<string, object>
            {
                ["prompt"]          = prompt,
                ["n"]               = opt.N,
                ["size"]            = opt.Size,
                ["response_format"] = opt.ResponseFormat,
            };
            if (opt.Seed.HasValue)          dict["seed"]           = opt.Seed.Value;
            if (opt.GuidanceScale.HasValue) dict["guidance_scale"] = opt.GuidanceScale.Value;
            if (opt.Steps.HasValue)         dict["steps"]          = opt.Steps.Value;
            return dict;
        }

        private static FluxGeneratedImage[] MapResults(FluxImageDatum[] data)
        {
            var results = new FluxGeneratedImage[data.Length];
            for (int i = 0; i < data.Length; i++)
            {
                var d   = data[i];
                var img = new FluxGeneratedImage { RevisedPrompt = d.RevisedPrompt };
                if (!string.IsNullOrEmpty(d.Url))    img.SasUri    = new Uri(d.Url);
                if (!string.IsNullOrEmpty(d.B64Json)) img.ImageData = new BinaryData(Convert.FromBase64String(d.B64Json));
                results[i] = img;
            }
            return results;
        }
    }
}
