using System.ClientModel;

namespace SimpleAzureOpenAIChatbot.AI
{
    /// <summary>
    /// Base class for all Azure AI HTTP clients (Chat, TTS, Image...).
    ///
    /// Handles the two responsibilities shared by every child client:
    ///   1. Authentication  — injects "api-key" OR "Bearer" header once.
    ///   2. URL resolution  — detects whether the endpoint is a full URL
    ///      (already contains the resource path) or a bare base URL that
    ///      needs the path appended.
    ///
    /// Child classes call <see cref="PostAsync"/> / <see cref="PostJsonAsync"/>
    /// and receive the raw <see cref="HttpResponseMessage"/> back.
    /// </summary>
    public abstract class AzureAIClientBase : IDisposable
    {
        // ── Protected state available to all children ─────────────────────────

        /// <summary>Shared HTTP client — do NOT dispose from child classes.</summary>
        protected readonly HttpClient Http;

        /// <summary>Deployment / model name (e.g. "gpt-4o", "tts-hd", "flux-schnell").</summary>
        protected readonly string DeploymentName;

        // ── Private ───────────────────────────────────────────────────────────

        private readonly bool _ownsHttpClient;

        // ── Construction ──────────────────────────────────────────────────────

        /// <summary>
        /// Resolves the POST URI and configures authentication.
        /// </summary>
        /// <param name="endpoint">
        ///   Full URL (path already included) OR bare base URL.
        ///   Auto-detected by checking whether <paramref name="resourcePath"/>
        ///   already appears inside the endpoint.
        /// </param>
        /// <param name="apiKey">Azure API key.</param>
        /// <param name="deploymentName">Deployment / model name.</param>
        /// <param name="resourcePath">
        ///   The URL path segment that belongs to this resource type,
        ///   e.g. "/audio/speech", "/images/generations", "/chat/completions".
        ///   Used both for detection (is this already a full URL?) and for
        ///   building the path when only a base URL is supplied.
        /// </param>
        /// <param name="apiVersion">Query-string api-version value.</param>
        /// <param name="authScheme">
        ///   <c>"api-key"</c> for Cognitive Services / Azure OpenAI (default).
        ///   <c>"Bearer"</c> for Azure AI Foundry serverless endpoints.
        /// </param>
        /// <param name="httpClient">Optional external HttpClient (DI / testing).</param>
        protected AzureAIClientBase(
            string      endpoint,
            string      apiKey,
            string      deploymentName,
            string      resourcePath,
            string      apiVersion,
            string      authScheme  = "api-key",
            HttpClient? httpClient  = null)
        {
            if (string.IsNullOrWhiteSpace(endpoint))       throw new ArgumentNullException(nameof(endpoint));
            if (string.IsNullOrWhiteSpace(apiKey))         throw new ArgumentNullException(nameof(apiKey));
            if (string.IsNullOrWhiteSpace(deploymentName)) throw new ArgumentNullException(nameof(deploymentName));

            DeploymentName  = deploymentName;
            _ownsHttpClient = httpClient == null;
            Http            = httpClient ?? new HttpClient();

            // ── Auth header ───────────────────────────────────────────────────
            if (authScheme == "api-key")
                Http.DefaultRequestHeaders.Add("api-key", apiKey);
            else
                Http.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue(authScheme, apiKey);

            // ── Resolve the exact POST URI once ───────────────────────────────
            RequestUri = ResolveUri(endpoint, deploymentName, resourcePath, apiVersion);
        }

        /// <summary>ApiKeyCredential overload — mirrors AzureOpenAIClient constructor.</summary>
        protected AzureAIClientBase(
            Uri              endpoint,
            ApiKeyCredential credential,
            string           deploymentName,
            string           resourcePath,
            string           apiVersion,
            string           authScheme  = "api-key",
            HttpClient?      httpClient  = null)
            : this(endpoint.ToString(),
                   ExtractKey(credential),
                   deploymentName,
                   resourcePath,
                   apiVersion,
                   authScheme,
                   httpClient)
        { }

        // ── Resolved request URI (read-only for children) ─────────────────────

        /// <summary>The fully-resolved URI that every POST in this client targets.</summary>
        protected Uri RequestUri { get; }

        // ── HTTP helpers for children ─────────────────────────────────────────

        /// <summary>POST a JSON-serializable payload; returns the raw response.</summary>
        protected async Task<HttpResponseMessage> PostJsonAsync<T>(
            T                 payload,
            CancellationToken cancellationToken = default)
        {
            var response = await Http
                .PostAsJsonAsync(RequestUri, payload, cancellationToken)
                .ConfigureAwait(false);

            await EnsureSuccessAsync(response, cancellationToken);
            return response;
        }

        // ── Private helpers ───────────────────────────────────────────────────

        /// <summary>
        /// Detects whether <paramref name="endpoint"/> already contains
        /// <paramref name="resourcePath"/> and either uses it as-is or
        /// constructs the standard Azure OpenAI path.
        /// </summary>
        private static Uri ResolveUri(
            string endpoint,
            string deploymentName,
            string resourcePath,
            string apiVersion)
        {
            var parsed = new Uri(endpoint);

            if (parsed.AbsolutePath.Contains(resourcePath, StringComparison.OrdinalIgnoreCase))
            {
                // Full URL — use directly, nothing appended.
                return parsed;
            }

            // Base URL — build the standard path.
            // Responses API (/openai/responses) is NOT deployment-scoped.
            // Everything else uses /openai/deployments/{name}/{resource}.
            string baseUrl = endpoint.TrimEnd('/');

            bool isResponsesApi = resourcePath.Equals("/openai/responses",
                StringComparison.OrdinalIgnoreCase);

            string path = isResponsesApi
                ? $"{baseUrl}{resourcePath}?api-version={Uri.EscapeDataString(apiVersion)}"
                : $"{baseUrl}/openai/deployments/{Uri.EscapeDataString(deploymentName)}{resourcePath}?api-version={Uri.EscapeDataString(apiVersion)}";

            return new Uri(path);
        }

        private static async Task EnsureSuccessAsync(
            HttpResponseMessage response,
            CancellationToken   cancellationToken)
        {
            if (response.IsSuccessStatusCode) return;

            string body = await response.Content
                .ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);

            throw new HttpRequestException(
                $"Azure AI returned HTTP {(int)response.StatusCode} " +
                $"({response.ReasonPhrase}). Body: {body}",
                inner:      null,
                statusCode: response.StatusCode);
        }

        internal static string ExtractKey(ApiKeyCredential credential)
        {
            if (credential is null) throw new ArgumentNullException(nameof(credential));
            credential.Deconstruct(out string key);
            return key;
        }

        // ── IDisposable ───────────────────────────────────────────────────────

        public void Dispose()
        {
            if (_ownsHttpClient) Http.Dispose();
        }
    }
}
