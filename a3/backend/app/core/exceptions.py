"""
Custom exceptions and error helpers.
"""

from fastapi import HTTPException, status


class NotFoundException(HTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class UnauthorizedException(HTTPException):
    def __init__(self, detail: str = "Unauthorized access"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ValidationException(HTTPException):
    def __init__(self, detail: str = "Invalid input or dataset"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
