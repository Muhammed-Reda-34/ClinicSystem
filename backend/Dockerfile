FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .

RUN dotnet restore ClinicSystem.sln

RUN dotnet publish src/ClinicSystem.Api/ClinicSystem.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

RUN dotnet tool install --global dotnet-ef --version 10.0.10
ENV PATH="${PATH}:/root/.dotnet/tools"

# EF tooling creates the migration bundle at image-build time.
# These values are build-only placeholders; production secrets are supplied
# later through Railway Variables and are never baked into the final image.
RUN ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=build_only;Username=build;Password=build_only" \
    Jwt__Key="build-only-placeholder-key-0123456789-0123456789-0123456789" \
    dotnet ef migrations bundle \
      --project src/ClinicSystem.Infrastructure \
      --startup-project src/ClinicSystem.Api \
      --configuration Release \
      --output /app/efbundle \
      --self-contained \
      --target-runtime linux-x64

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .
COPY --from=build /app/efbundle ./efbundle

RUN chmod +x ./efbundle

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "dotnet ClinicSystem.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]