package com.electropro.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public final class Repositories {
    private Repositories() {}

    public interface UserRepository extends JpaRepository<AppUser, Long> {
        Optional<AppUser> findByEmailIgnoreCase(String email);

        boolean existsByEmailIgnoreCase(String email);

        List<AppUser> findAllByOrderByFullNameAsc();

        long countByActiveTrue();

        long countByRoleAndActiveTrue(AppUser.Role role);
    }

    public interface ClientRepository extends JpaRepository<Client, Long> {
        List<Client> findByArchivedFalseOrderByNameAsc();

        @Query("select c from Client c where c.archived = false and (lower(c.name) like lower(concat('%', :q, '%')) or lower(coalesce(c.email, '')) like lower(concat('%', :q, '%'))) order by c.name")
        List<Client> search(@Param("q") String q);

        long countByArchivedFalse();
    }

    public interface ContactRequestRepository extends JpaRepository<ContactRequest, Long> {
        List<ContactRequest> findAllByOrderByCreatedAtDesc();

        List<ContactRequest> findByStatusOrderByCreatedAtDesc(ContactRequest.Status status);

        long countByStatus(ContactRequest.Status status);
    }

    public interface ProjectRepository extends JpaRepository<Project, Long> {
        List<Project> findAllByOrderByCreatedAtDesc();

        @Query("select p from Project p where :userId member of p.memberIds order by p.createdAt desc")
        List<Project> findForMember(@Param("userId") Long userId);

        long countByStatus(Project.Status status);

        List<Project> findByStatusOrderByEndDateAscIdAsc(Project.Status status);
    }

    public interface ProjectUpdateRepository extends JpaRepository<ProjectUpdate, Long> {
        List<ProjectUpdate> findByProjectIdOrderByCreatedAtDescIdDesc(Long projectId);
    }

    public interface AbsenceRepository extends JpaRepository<Absence, Long> {
        /** Absences qui touchent la période [from, to]. */
        @Query("select a from Absence a where a.startDate <= :to and a.endDate >= :from order by a.startDate, a.id")
        List<Absence> overlapping(@Param("from") LocalDate from, @Param("to") LocalDate to);

        @Query("select a from Absence a where a.userId = :userId and a.startDate <= :to and a.endDate >= :from order by a.startDate, a.id")
        List<Absence> overlappingForUser(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

        List<Absence> findByUserIdOrderByStartDateDescIdDesc(Long userId);

        List<Absence> findAllByOrderByStartDateDescIdDesc();
    }

    public interface CatalogItemRepository extends JpaRepository<CatalogItem, Long> {
        List<CatalogItem> findByArchivedFalseOrderByNameAsc();
    }

    public interface TaskRepository extends JpaRepository<Task, Long> {
        List<Task> findAllByOrderByDueDateAscIdAsc();

        List<Task> findByAssigneeIdOrderByDueDateAscIdAsc(Long assigneeId);

        boolean existsByProjectIdAndAssigneeIdAndStatusNot(Long projectId, Long assigneeId, Task.Status status);

        long countByStatusNot(Task.Status status);

        List<Task> findByProjectIdOrderByDueDateAscIdAsc(Long projectId);
    }

    public interface SalarySettingRepository extends JpaRepository<SalarySetting, Long> {}

    public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {
        List<SalaryPayment> findByPeriod(String period);

        List<SalaryPayment> findByUserIdOrderByPaidOnDescIdDesc(Long userId);
    }

    public interface MaterialRepository extends JpaRepository<Material, Long> {
        List<Material> findByProjectIdOrderByIdAsc(Long projectId);

        /** Acheté mais pas encore facturé. */
        List<Material> findByProjectIdAndPurchasedOnIsNotNullAndInvoiceIdIsNullOrderByIdAsc(Long projectId);

        List<Material> findByInvoiceId(Long invoiceId);

        List<Material> findAllByOrderByProjectIdAscIdAsc();
    }

    public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
        List<Invoice> findAllByOrderByIdDesc();

        List<Invoice> findByProjectIdOrderByIdDesc(Long projectId);
    }

    public interface InvoiceLineRepository extends JpaRepository<InvoiceLine, Long> {
        List<InvoiceLine> findByInvoiceIdOrderByPositionAsc(Long invoiceId);

        void deleteByInvoiceId(Long invoiceId);
    }

    public interface InvoicePaymentRepository extends JpaRepository<InvoicePayment, Long> {
        List<InvoicePayment> findByInvoiceIdOrderByPaidOnAscIdAsc(Long invoiceId);

        List<InvoicePayment> findByInvoiceIdIn(Collection<Long> invoiceIds);
    }

    public interface QuoteRepository extends JpaRepository<Quote, Long> {
        List<Quote> findAllByOrderByIdDesc();

        List<Quote> findByProjectIdOrderByIdDesc(Long projectId);
    }

    public interface QuoteLineRepository extends JpaRepository<QuoteLine, Long> {
        List<QuoteLine> findByQuoteIdOrderByPositionAsc(Long quoteId);

        void deleteByQuoteId(Long quoteId);
    }

    public interface QuoteCounterRepository extends JpaRepository<QuoteCounter, Integer> {
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select c from QuoteCounter c where c.quoteYear = :y")
        Optional<QuoteCounter> lockByYear(@Param("y") int year);
    }

    public interface CompanySettingsRepository extends JpaRepository<CompanySettings, Integer> {}

    public interface InvoiceCounterRepository extends JpaRepository<InvoiceCounter, Integer> {
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select c from InvoiceCounter c where c.invoiceYear = :y")
        Optional<InvoiceCounter> lockByYear(@Param("y") int year);
    }

    public interface RealisationRepository extends JpaRepository<Realisation, Long> {
        List<Realisation> findAllByOrderByIdDesc();

        List<Realisation> findByAuthorIdOrderByIdDesc(Long authorId);

        List<Realisation> findByPublishedTrueOrderByCompletedOnDescIdDesc();
    }

    public interface RealisationPhotoRepository extends JpaRepository<RealisationPhoto, Long> {
        List<RealisationPhoto> findByRealisationIdInOrderByPositionAsc(Collection<Long> realisationIds);

        List<RealisationPhoto> findByRealisationIdOrderByPositionAsc(Long realisationId);
    }
}
