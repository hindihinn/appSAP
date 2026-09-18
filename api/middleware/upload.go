package middleware

import (
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Allowed MIME types
var allowedMimeTypes = map[string]bool{
	"image/jpeg":      true,
	"image/jpg":       true,
	"image/png":       true,
	"image/webp":      true,
	"application/pdf": true,
}

// Helper to validate and convert uploaded files to Base64 data URI
func SaveUploadedFile(c *gin.Context, fileHeader *multipart.FileHeader, subDir string) (string, error) {
	// Size limit check (10MB)
	if fileHeader.Size > 10*1024*1024 {
		return "", fmt.Errorf("file size exceeds 10MB limit")
	}

	// Open file
	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	// Read all bytes
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return "", err
	}

	// Detect MIME type
	var buffer []byte
	if len(fileBytes) > 512 {
		buffer = fileBytes[:512]
	} else {
		buffer = fileBytes
	}
	mimeType := http.DetectContentType(buffer)
	if mimeType == "application/octet-stream" {
		mimeType = fileHeader.Header.Get("Content-Type")
	}

	// Validate mime type
	if !allowedMimeTypes[mimeType] {
		return "", fmt.Errorf("tipe file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF")
	}

	// Encode to base64
	base64Data := base64.StdEncoding.EncodeToString(fileBytes)
	dataURL := fmt.Sprintf("data:%s;base64,%s", mimeType, base64Data)

	return dataURL, nil
}
