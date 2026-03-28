<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\OracleCategory;
use App\Entity\OracleOption;
use App\Oracle\OracleService;
use App\Repository\OracleCategoryRepository;
use App\Repository\OracleOptionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/admin')]
class AdminController extends AbstractController
{
    public function __construct(
        private readonly OracleService            $oracleService,
        private readonly OracleCategoryRepository $categoryRepository,
        private readonly OracleOptionRepository   $optionRepository,
        private readonly EntityManagerInterface   $entityManager,
    ) {}

    // -------------------------------------------------------------------------
    // GET /api/admin/oracle — List all categories with their options
    // -------------------------------------------------------------------------

    #[Route('/oracle', name: 'api_admin_oracle_list', methods: ['GET'])]
    public function listOracle(): JsonResponse
    {
        $tables = $this->oracleService->getAllTables();

        $payload = [];
        foreach ($tables as $categoryName => $data) {
            $payload[] = [
                'id'      => $data['id'],
                'name'    => $categoryName,
                'options' => $data['options'],
            ];
        }

        return $this->json($payload);
    }

    // -------------------------------------------------------------------------
    // POST /api/admin/oracle/{categoryName} — Add a new option to a category
    // -------------------------------------------------------------------------

    #[Route('/oracle/{categoryName}', name: 'api_admin_oracle_add_option', methods: ['POST'])]
    public function addOption(string $categoryName, Request $request): JsonResponse
    {
        if (!\in_array($categoryName, OracleCategory::VALID_NAMES, true)) {
            return $this->json(
                ['error' => \sprintf('Unknown category "%s". Valid values: %s.', $categoryName, \implode(', ', OracleCategory::VALID_NAMES))],
                404
            );
        }

        $data = $this->decodeJson($request);
        if ($data === null) {
            return $this->json(['error' => 'Invalid request body'], 400);
        }

        $errors = [];

        $value = \strip_tags(\trim((string) ($data['value'] ?? '')));
        $hint  = \strip_tags(\trim((string) ($data['hint'] ?? '')));

        if ($value === '') {
            $errors['value'] = 'This field is required.';
        } elseif (\strlen($value) > 255) {
            $errors['value'] = 'This field must not exceed 255 characters.';
        }

        if (\strlen($hint) > 500) {
            $errors['hint'] = 'This field must not exceed 500 characters.';
        }

        if ($errors !== []) {
            return $this->json(['error' => 'Validation failed', 'details' => $errors], 422);
        }

        // Fetch or create the category row
        $category = $this->categoryRepository->findOneBy(['name' => $categoryName]);
        if ($category === null) {
            $displayOrder = (int) \array_search($categoryName, OracleCategory::VALID_NAMES, true);
            $category = new OracleCategory();
            $category->setName($categoryName);
            $category->setDisplayOrder($displayOrder);
            $this->entityManager->persist($category);
        }

        $option = new OracleOption();
        $option->setCategory($category);
        $option->setValue($value);
        $option->setHint($hint !== '' ? $hint : null);
        $option->setIsActive(true);

        $this->entityManager->persist($option);
        $this->entityManager->flush();

        return $this->json($this->serializeOption($option), 201);
    }

    // -------------------------------------------------------------------------
    // PUT /api/admin/oracle/options/{id} — Update an option
    // -------------------------------------------------------------------------

    #[Route('/oracle/options/{id}', name: 'api_admin_oracle_update_option', methods: ['PUT'])]
    public function updateOption(int $id, Request $request): JsonResponse
    {
        $option = $this->optionRepository->find($id);
        if ($option === null) {
            return $this->json(['error' => 'Option not found'], 404);
        }

        $data = $this->decodeJson($request);
        if ($data === null) {
            return $this->json(['error' => 'Invalid request body'], 400);
        }

        $errors = [];

        // Only update fields that are present in the payload
        if (\array_key_exists('value', $data)) {
            $value = \strip_tags(\trim((string) $data['value']));
            if ($value === '') {
                $errors['value'] = 'This field must not be empty.';
            } elseif (\strlen($value) > 255) {
                $errors['value'] = 'This field must not exceed 255 characters.';
            } else {
                $option->setValue($value);
            }
        }

        if (\array_key_exists('hint', $data)) {
            $hint = \strip_tags(\trim((string) $data['hint']));
            if (\strlen($hint) > 500) {
                $errors['hint'] = 'This field must not exceed 500 characters.';
            } else {
                $option->setHint($hint !== '' ? $hint : null);
            }
        }

        if (\array_key_exists('is_active', $data)) {
            $option->setIsActive((bool) $data['is_active']);
        }

        if ($errors !== []) {
            return $this->json(['error' => 'Validation failed', 'details' => $errors], 422);
        }

        $this->entityManager->flush();

        return $this->json($this->serializeOption($option));
    }

    // -------------------------------------------------------------------------
    // DELETE /api/admin/oracle/options/{id} — Soft-delete (deactivate) an option
    // -------------------------------------------------------------------------

    #[Route('/oracle/options/{id}', name: 'api_admin_oracle_delete_option', methods: ['DELETE'])]
    public function deleteOption(int $id): JsonResponse
    {
        $option = $this->optionRepository->find($id);
        if ($option === null) {
            return $this->json(['error' => 'Option not found'], 404);
        }

        $option->setIsActive(false);
        $this->entityManager->flush();

        return $this->json(['message' => 'Option deactivated successfully']);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Decodes the JSON request body and returns the data array, or null on failure.
     *
     * @return array<string, mixed>|null
     */
    private function decodeJson(Request $request): ?array
    {
        $content = $request->getContent();
        if ($content === '') {
            return [];
        }

        try {
            $data = \json_decode($content, true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return \is_array($data) ? $data : null;
    }

    /** @return array<string, mixed> */
    private function serializeOption(OracleOption $option): array
    {
        return [
            'id'            => $option->getId(),
            'category'      => $option->getCategory()->getName(),
            'value'         => $option->getValue(),
            'hint'          => $option->getHint() ?? '',
            'is_active'     => $option->isActive(),
            'display_order' => $option->getDisplayOrder(),
        ];
    }
}
