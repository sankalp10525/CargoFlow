"""Custom exception handler."""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "error": True,
            "status_code": response.status_code,
            "detail": response.data,
        }
        # Flatten single-key 'detail' responses
        if isinstance(response.data, dict) and list(response.data.keys()) == ["detail"]:
            error_data["detail"] = str(response.data["detail"])
        response.data = error_data
        return response

    logger.exception("Unhandled exception", exc_info=exc)
    return Response(
        {"error": True, "status_code": 500, "detail": "Internal server error."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
