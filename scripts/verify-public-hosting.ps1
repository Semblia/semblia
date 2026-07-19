[CmdletBinding()]
param(
  [Parameter(Mandatory)] [uri] $FormsBaseUrl,
  [Parameter(Mandatory)] [uri] $WallsBaseUrl,
  [Parameter(Mandatory)] [string] $AlphaFormsHost,
  [Parameter(Mandatory)] [string] $BetaFormsHost,
  [Parameter(Mandatory)] [string] $AlphaWallsHost,
  [Parameter(Mandatory)] [string] $BetaWallsHost,
  [Parameter(Mandatory)] [string] $SharedFormSlug,
  [Parameter(Mandatory)] [string] $AlphaWallSlug,
  [Parameter(Mandatory)] [string] $BetaWallSlug,
  [Parameter(Mandatory)] [string] $HostileFormSlug,
  [string] $UnknownFormsHost = 'unknown.forms.semblia.com',
  [string] $UnknownWallsHost = 'unknown.walls.semblia.com',
  [string] $ExactFormsHost = 'forms.semblia.com',
  [string] $ExactWallsHost = 'walls.semblia.com',
  [string] $ExactProjectId,
  [int] $TimeoutSeconds = 15
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# Credential-free, read-only verifier. No provider/DNS commands, cookies, or
# response bodies are emitted. Bases must be localhost or an approved endpoint.
$failures = [System.Collections.Generic.List[string]]::new()
$handler = [System.Net.Http.HttpClientHandler]::new(); $handler.AllowAutoRedirect = $false
$client = [System.Net.Http.HttpClient]::new($handler); $client.Timeout = [TimeSpan]::FromSeconds($TimeoutSeconds)
function Get-SafeResponse { param([uri] $BaseUrl, [string] $Path, [string] $RequestHost, [hashtable] $Query = @{})
  $b = [System.UriBuilder]::new($BaseUrl); $b.Path = "$($b.Path.TrimEnd('/'))/$($Path.TrimStart('/'))"
  if ($Query.Count) { $b.Query = (($Query.GetEnumerator() | Sort-Object Key | ForEach-Object { '{0}={1}' -f [uri]::EscapeDataString([string]$_.Key), [uri]::EscapeDataString([string]$_.Value) }) -join '&') }
  $r = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $b.Uri); $r.Headers.Host = $RequestHost; $r.Headers.TryAddWithoutValidation('User-Agent','semblia-public-hosting-verifier/1.0') | Out-Null
  try { $x = $client.Send($r); [pscustomobject]@{ Status=[int]$x.StatusCode; Headers=$x.Headers; ContentHeaders=$x.Content.Headers; Body=$x.Content.ReadAsStringAsync().GetAwaiter().GetResult(); RequestHost=$RequestHost } } catch { throw "request failed for host=$RequestHost path=${Path}: $($_.Exception.Message)" } finally { $r.Dispose() }
}
function HeaderValue { param($Response,[string]$Name) $v=$null; if($Response.Headers.TryGetValues($Name,[ref]$v) -or $Response.ContentHeaders.TryGetValues($Name,[ref]$v)){return ($v -join ', ')}; '' }
function Assert-Status { param([string]$Name,$Response,[int[]]$Expected) if($Expected -notcontains $Response.Status){$failures.Add("$Name expected HTTP $($Expected -join '/') but received HTTP $($Response.Status) (host=$($Response.RequestHost))")} }
function Assert-Match { param([string]$Name,[string]$Actual,[string]$Pattern) if([string]::IsNullOrWhiteSpace($Actual) -or $Actual -notmatch $Pattern){$failures.Add("$Name missing or invalid; checked safe header/markup marker only")} }
function Assert-AbsentHeader { param([string]$Name,$Response,[string]$Header) if(-not [string]::IsNullOrWhiteSpace((HeaderValue $Response $Header))){$failures.Add("$Name unexpectedly emitted $Header")} }
try {
  $alphaForm=Get-SafeResponse $FormsBaseUrl "/f/$SharedFormSlug" $AlphaFormsHost; $betaForm=Get-SafeResponse $FormsBaseUrl "/f/$SharedFormSlug" $BetaFormsHost
  Assert-Status 'alpha same-slug form' $alphaForm @(200); Assert-Status 'beta same-slug form' $betaForm @(200)
  if($alphaForm.Body -eq $betaForm.Body){$failures.Add('same-slug tenant isolation failed: alpha and beta returned identical HTML')}
  Assert-Match 'alpha forms robots header' (HeaderValue $alphaForm 'X-Robots-Tag') '(?i)noindex'; Assert-Match 'alpha forms noindex meta' $alphaForm.Body '(?i)<meta[^>]+(?:name=["'']robots["''][^>]+content=["''][^"'']*noindex|content=["''][^"'']*noindex[^"'']*["''][^>]+name=["'']robots)'
  Assert-Match 'beta forms robots header' (HeaderValue $betaForm 'X-Robots-Tag') '(?i)noindex'; Assert-Match 'beta forms noindex meta' $betaForm.Body '(?i)<meta[^>]+(?:name=["'']robots["''][^>]+content=["''][^"'']*noindex|content=["''][^"'']*noindex[^"'']*["''][^>]+name=["'']robots)'
  Assert-Match 'alpha forms CSP' (HeaderValue $alphaForm 'Content-Security-Policy') '(?i)default-src'; Assert-Match 'beta forms nosniff' (HeaderValue $betaForm 'X-Content-Type-Options') '(?i)^nosniff$'
  Assert-AbsentHeader 'alpha form' $alphaForm 'Set-Cookie'; Assert-AbsentHeader 'beta form' $betaForm 'Set-Cookie'
  Assert-Status 'unknown form host opaque failure' (Get-SafeResponse $FormsBaseUrl "/f/$SharedFormSlug" $UnknownFormsHost) @(404)
  Assert-Status 'cross-project form slug rejection' (Get-SafeResponse $FormsBaseUrl "/f/$HostileFormSlug" $AlphaFormsHost) @(404)
  $wildcard=Get-SafeResponse $FormsBaseUrl "/f/$SharedFormSlug" $AlphaFormsHost @{projectId='hostile-project-id'}; Assert-Status 'wildcard projectId authority rejection/ignore' $wildcard @(200,400,404); if($wildcard.Status -eq 200 -and $wildcard.Body -ne $alphaForm.Body){$failures.Add('wildcard projectId changed a successful form response')}
  $q=@{}; if($ExactProjectId){$q.projectId=$ExactProjectId}; $exactForm=Get-SafeResponse $FormsBaseUrl "/f/$SharedFormSlug" $ExactFormsHost $q
  if($ExactProjectId){Assert-Status 'known-valid exact forms-host compatibility' $exactForm @(200)}else{Assert-Status 'optional exact forms-host compatibility' $exactForm @(200,400,404)}
  $alphaWall=Get-SafeResponse $WallsBaseUrl '/' $AlphaWallsHost; $betaWall=Get-SafeResponse $WallsBaseUrl '/' $BetaWallsHost
  Assert-Status 'alpha primary wall' $alphaWall @(200); Assert-Status 'beta primary wall' $betaWall @(200)
  if($alphaWall.Body -eq $betaWall.Body){$failures.Add('primary-wall tenant isolation failed: alpha and beta returned identical HTML')}
  Assert-Match 'alpha wall cache isolation' (HeaderValue $alphaWall 'Cache-Control') '(?i)no-store'; Assert-Match 'alpha wall canonical' $alphaWall.Body ('(?i)<link[^>]+rel=["'']canonical["''][^>]+https?://' + [regex]::Escape($AlphaWallsHost)); Assert-Match 'alpha wall Open Graph URL' $alphaWall.Body ('(?i)property=["'']og:url["''][^>]+https?://' + [regex]::Escape($AlphaWallsHost)); Assert-Match 'alpha wall JSON-LD' $alphaWall.Body '(?is)application/ld\+json.*?(Organization|WebSite)'
  Assert-Match 'beta wall cache isolation' (HeaderValue $betaWall 'Cache-Control') '(?i)no-store'; Assert-Match 'beta wall canonical' $betaWall.Body ('(?i)<link[^>]+rel=["'']canonical["''][^>]+https?://' + [regex]::Escape($BetaWallsHost)); Assert-Match 'beta wall Open Graph URL' $betaWall.Body ('(?i)property=["'']og:url["''][^>]+https?://' + [regex]::Escape($BetaWallsHost)); Assert-Match 'beta wall JSON-LD' $betaWall.Body '(?is)application/ld\+json.*?(Organization|WebSite)'
  Assert-Match 'alpha wall CSP' (HeaderValue $alphaWall 'Content-Security-Policy') '(?i)default-src'; Assert-Match 'beta wall nosniff' (HeaderValue $betaWall 'X-Content-Type-Options') '(?i)^nosniff$'
  Assert-AbsentHeader 'alpha wall' $alphaWall 'Set-Cookie'; Assert-AbsentHeader 'beta wall' $betaWall 'Set-Cookie'
  Assert-Status 'alpha additional wall' (Get-SafeResponse $WallsBaseUrl "/w/$AlphaWallSlug" $AlphaWallsHost) @(200); Assert-Status 'cross-project wall slug rejection' (Get-SafeResponse $WallsBaseUrl "/w/$BetaWallSlug" $AlphaWallsHost) @(404); Assert-Status 'unknown wall host opaque failure' (Get-SafeResponse $WallsBaseUrl '/' $UnknownWallsHost) @(404); Assert-Status 'exact walls service host' (Get-SafeResponse $WallsBaseUrl '/' $ExactWallsHost) @(404); Assert-Status 'direct wall internal route' (Get-SafeResponse $WallsBaseUrl '/_wall-host' $AlphaWallsHost) @(404); Assert-Status 'wall robots' (Get-SafeResponse $WallsBaseUrl '/robots.txt' $AlphaWallsHost) @(200); Assert-Status 'eligible wall sitemap' (Get-SafeResponse $WallsBaseUrl '/sitemap.xml' $AlphaWallsHost) @(200)
} finally { $client.Dispose() }
if($failures.Count){Write-Error ("PUBLIC HOSTING VERIFICATION FAILED ($($failures.Count) checks):`n - "+($failures -join "`n - ")); exit 1}
Write-Output 'PUBLIC HOSTING VERIFICATION PASSED: host isolation, rejection boundaries, exact compatibility, forms noindex, and wall SEO/cache checks passed.'
